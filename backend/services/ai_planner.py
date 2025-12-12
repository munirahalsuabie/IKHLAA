import json
import re
from typing import Dict, List, Optional

from groq import Groq
from config import GROQ_API_KEY, AI_MODEL
from services.geo import direction_from_user_to_target

client = Groq(api_key=GROQ_API_KEY)

def _build_system_prompt(context: str) -> str:
    """
    Strict system prompt in Arabic.

    Enforces:
    - JSON only
    - Arabic only
    - reasoning = exactly 1 sentences
    - instructions_list = mixed (navigation + safety)
    """
    return f"""
أنت "إخلاء"، نظام طوارئ سعودي ذكي.

المهمة:
إنتاج خطة إخلاء بصيغة JSON فقط.

قواعد صارمة:
1) المخرجات JSON فقط، بدون أي شرح.
2) اللغة العربية فقط، ممنوع أي أحرف إنجليزية.
3) reasoning:
   - جملة فقط EXACTLY.
   - الجملة الأولى: سبب اختيار المكان ويجب ذكر اسم "اسم_الوجهة".
4) instructions_list:
   - الحد الأدنى 4 عناصر.
   - تعليمات السلامة يجب أن تكون مأخوذة من بروتوكول السيول أدناه (معاد صياغتها).
   - التوجيهات الملاحية تُنسخ كما هي من خطوات المسار.
5) voice_script: جملة واحدة مختصرة.

بروتوكول السيول (مرجع):
{context}

البنية المطلوبة:
{{
  "reasoning": "جملة ١.",
  "distance_km": 1.2,
  "eta_minutes": 5,
  "instructions_list": ["...", "...", "...", "..."],
  "voice_script": "..."
}}
"""

def _build_user_prompt(
    user_lat: float,
    user_lng: float,
    target_zone: Dict,
    distance_km: float,
    eta_minutes: int,
    danger_zones: List[Dict],
    crowded_zones: List[Dict],
    direction_phrase: str,
    route_steps: Optional[List[str]] = None,
) -> str:
    """
    Builds the user prompt.
    route_steps are provided so the model DOES NOT invent navigation.
    """
    route_steps = route_steps or []

    def _nearby_names(zones, max_km=3.0):
        from services.geo import haversine_km
        out = []
        for z in zones:
            if haversine_km(user_lat, user_lng, z["lat"], z["lng"]) <= max_km:
                out.append(z["name"])
        return out

    danger_txt = "، ".join(_nearby_names(danger_zones)) or "لا يوجد مخاطر قريبة"
    crowd_txt = "، ".join(_nearby_names(crowded_zones)) or "لا يوجد ازدحام قريب"

    route_txt = " | ".join(route_steps[:2]) if route_steps else "لا توجد خطوات مسار"

    return f"""
[الوضع الحالي]
- موقع المستخدم: {user_lat}, {user_lng}
- اسم_الوجهة: {target_zone['name']}
- المسافة: {distance_km:.2f} كم
- الوقت المتوقع: {eta_minutes} دقيقة
- الاتجاه: {direction_phrase}

[المخاطر القريبة]
{danger_txt}

[الازدحام القريب]
{crowd_txt}

[خطوات_المسار]
{route_txt}

[المطلوب]
أنشئ JSON فقط.
- reasoning جملة واحدة فقط.
- تعليمات السلامة من بروتوكول السيول وبأسلوب أوامر قصيرة.
"""


def _strip_english(text: str) -> str:
    return re.sub(r"[A-Za-z]", "", text or "").strip()


def _is_navigation(text: str) -> bool:
    nav_words = [
        "اتجه", "انعطف", "تابع", "استمر", "يمين", "يسار",
        "شمال", "جنوب", "متر", "كم", "دقيقة"
    ]
    return any(w in text for w in nav_words) or bool(re.search(r"\d", text))

def _extract_json_from_text(
    text: str,
    target_name: str,
    route_steps: List[str],
) -> Dict:
    try:
        match = re.search(r"\{[\s\S]*\}", text or "")
        raw = match.group(0) if match else "{}"
        data = json.loads(raw)

        # --- reasoning (2 sentences only) ---
        reasoning = _strip_english(data.get("reasoning", ""))
        parts = re.split(r"[.!؟]", reasoning)
        parts = [p.strip() for p in parts if len(p.strip()) > 2]

        if len(parts) < 2:
            parts = [
                f"تم اختيار {target_name} لأنها أبعد عن مجاري السيول وأكثر أماناً",
                "تحرك الآن عبر المسار المقترح وتجنب مجاري السيول",
            ]

        data["reasoning"] = f"{parts[0]}. {parts[1]}."

        # --- build mixed instructions_list ---
        safety_pool = [
            "ابتعد فوراً عن مجاري السيول والأودية",
            "لا تحاول عبور السيل سيراً أو بالمركبة",
            "تجنب الأنفاق والمناطق المنخفضة",
            "ابتعد عن أعمدة الإنارة والأسلاك الكهربائية",
        ]

        safety_cmds = []
        for s in safety_pool:
            if len(safety_cmds) < 2:
                safety_cmds.append(s)

        nav_cmds = [_strip_english(s) for s in route_steps if s.strip()][:2]

        mixed = []
        if nav_cmds:
            mixed.append(nav_cmds[0])
        if safety_cmds:
            mixed.append(safety_cmds[0])
        if len(nav_cmds) > 1:
            mixed.append(nav_cmds[1])
        if len(safety_cmds) > 1:
            mixed.append(safety_cmds[1])

        data["instructions_list"] = mixed[:4]

        # --- voice ---
        voice = _strip_english(data.get("voice_script", ""))
        data["voice_script"] = voice or "تنبيه سيل، اتبع المسار الآمن وابتعد عن مجاري السيول"

        data["distance_km"] = float(data.get("distance_km", 0))
        data["eta_minutes"] = int(data.get("eta_minutes", 0))

        return data

    except Exception:
        return {
            "reasoning": f"تم اختيار {target_name} لأنها أبعد عن مجاري السيول وأكثر أماناً. تحرك الآن عبر المسار المقترح وتجنب مجاري السيول.",
            "distance_km": 0,
            "eta_minutes": 0,
            "instructions_list": route_steps[:1] + [
                "ابتعد فوراً عن مجاري السيول",
                route_steps[1] if len(route_steps) > 1 else "تجنب الأنفاق والمناطق المنخفضة",
                "لا تحاول عبور السيل سيراً أو بالمركبة",
            ],
            "voice_script": "تنبيه سيل، اتبع المسار الآمن وابتعد عن مجاري السيول",
        }


def generate_evacuation_plan(
    context: str,
    user_lat: float,
    user_lng: float,
    target_zone: Dict,
    distance_km: float,
    eta_minutes: int,
    danger_zones: List[Dict],
    crowded_zones: List[Dict],
    route_steps: Optional[List[str]] = None,
) -> Dict:
    route_steps = route_steps or []

    direction_phrase = direction_from_user_to_target(
        user_lat, user_lng, target_zone["lat"], target_zone["lng"]
    )

    system_prompt = _build_system_prompt(context)
    user_prompt = _build_user_prompt(
        user_lat,
        user_lng,
        target_zone,
        distance_km,
        eta_minutes,
        danger_zones,
        crowded_zones,
        direction_phrase,
        route_steps,
    )

    try:
        completion = client.chat.completions.create(
            model=AI_MODEL,
            temperature=0.1,
            max_tokens=400,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )

        return _extract_json_from_text(
            completion.choices[0].message.content,
            target_zone["name"],
            route_steps,
        )

    except Exception:
        return _extract_json_from_text("", target_zone["name"], route_steps)
