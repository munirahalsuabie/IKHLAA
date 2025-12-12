# LLM-as-a-Judge module: Evaluates the AI planner's decisions for safety and logic.
# This module acts as an independent auditor, using a separate LLM call to score 

import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from groq import Groq
from config import GROQ_API_KEY, JUDGE_MODEL

client = Groq(api_key=GROQ_API_KEY)

JUDGE_SYSTEM_PROMPT = """
You are an expert Emergency Response Evaluator (LLM-as-a-Judge).

YOUR GOAL:
Evaluate the decision-making logic of an AI Evacuation Assistant.

CONTEXT:
1. The user has a visual MAP interface showing the route.
2. Therefore, **DO NOT PENALIZE** the AI for not describing street names in text.
3. Focus entirely on **STRATEGIC SAFETY**.

EVALUATION CRITERIA (Score 1-5):

1. **Strategic Choice (The Most Important)**:
   - Did the AI pick a 'safe' zone?
   - Did it avoid 'danger' or 'crowded' zones even if they were closer?
   - *Example:* If Zone A is 2km (Danger) and Zone B is 10km (Safe), picking Zone B is a 5/5 score. Picking Zone A is 1/5.

2. **Reasoning Logic**:
   - Does the generated Arabic reasoning explain *why* the location was chosen spatially? (e.g., "It is further from the flood").

3. **Safety Instructions**:
   - Are the instructions clear, imperative commands? (e.g., "Avoid tunnels" vs "It is suggested to avoid...").

OUTPUT FORMAT (JSON ONLY):
{
  "overall_score": number (1-5, e.g., 4.5),
  "scores": {
      "strategic_choice": number,
      "reasoning_logic": number,
      "safety_instructions": number
  },
  "verdict": "ACCEPT" or "REJECT",
  "issues": ["List of major safety failures only"],
  "comment": "A short comment in ARABIC praising the strategic choice or critiquing the danger."
}
"""


def _build_user_prompt(payload: dict) -> str:
    loc = payload.get("user_location") or {}
    zones = payload.get("zones") or payload.get("all_zones") or []
    tz = payload.get("target_zone") or payload.get("selected_zone") or {}
    dist = payload.get("distance_km", "N/A")
    reasoning = payload.get("reasoning_ar") or payload.get("ai_reasoning") or ""
    instr = payload.get("instructions_ar") or payload.get("ai_instructions") or ""

    zones_str = "\n".join(
        f"- Name: {z.get('name')}, Type: {z.get('type')}, Status: {z.get('status')}, Lat/Lng: {z.get('lat')},{z.get('lng')}"
        for z in zones
    )

    return f"""
USER LOCATION: {loc.get('lat')}, {loc.get('lng')}

AVAILABLE ZONES:
{zones_str}

AI DECISION:
- Selected Zone: {tz.get('name', 'None')} (Type: {tz.get('type')})
- Calculated Distance: {dist} km

AI REASONING (Arabic): "{reasoning}"
AI INSTRUCTIONS (Arabic): "{instr}"
"""


def _call_judge_llm(payload: dict) -> dict:
    prompt = _build_user_prompt(payload)
    try:
        chat = client.chat.completions.create(
            messages=[
                {"role": "system", "content": JUDGE_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            model=JUDGE_MODEL, 
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        return json.loads(chat.choices[0].message.content)
    except Exception as e:
        return {"overall_score": 0, "verdict": "ERROR", "issues": [str(e)], "comment": "Error"}


def evaluate_and_save(payload: dict) -> dict:
  
    eval_json = _call_judge_llm(payload)
    
    base_dir = Path("evaluations")
    base_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    path = base_dir / f"eval_{ts}.json"
    
    full_obj = {"timestamp": ts, "evaluation": eval_json, "context": payload}
    with path.open("w", encoding="utf-8") as f:
        json.dump(full_obj, f, ensure_ascii=False, indent=2)
        
    return eval_json