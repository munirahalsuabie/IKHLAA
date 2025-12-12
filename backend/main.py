# FastAPI entrypoint for IKHLAA MVP
# Endpoints:
# - /map-data       : Returns map zones (danger, crowded, safe).
# - /navigate       : AI Routing (Selects safe zone, AI reasoning, TTS, Real Route).
# - /alert-911      : Simulated SOS endpoint with a global counter.
# - /dashboard      : Basic statistics for the frontend dashboard.
# - /flood-prediction: Flood spread prediction using real weather data.

import time
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Local Module Imports 
from services.flood_predictor import FloodSpreadPredictor 
from data.zones import ALL_ZONES
from rag.knowledge import load_saudi_protocol
from services.ai_planner import generate_evacuation_plan
from services.geo import compute_eta_minutes, haversine_km, score_safe_zone
from services.routing import get_real_road_route
from services.tts import generate_audio_async
from services.judge import evaluate_and_save
from config import OPENWEATHER_API_KEY

# Configuration & Setup
app = FastAPI(title="IKHLAA MVP API", description="Emergency Response Backend")

# Validation: Ensure API Key exists
if not OPENWEATHER_API_KEY:
    raise HTTPException(status_code=500, detail="OPENWEATHER_API_KEY is not configured")

# CORS Setup: Allow all origins for easier hackathon integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global State (In-Memory)
# Global counter for simulated SOS reports (resets on server restart)
REPORT_COUNT = 1240

# Global timestamp for when the fire/incident started (set on first navigation)
fire_start_time: Optional[datetime] = None


# Data Models
class UserLocation(BaseModel):
    """Data model for receiving user coordinates."""
    lat: float
    lng: float

# Helper Functions
def get_flood_radius() -> float:
    """
    Compute a simulated flood radius (in km) that grows smoothly over time.
    
    The radius expands based on the wall-clock time elapsed since 
    the first /navigate call was made.
    
    Returns:
        float: Radius in kilometers.
    """
    global fire_start_time

    if fire_start_time is None:
        return 0.15  

    elapsed = (datetime.now() - fire_start_time).total_seconds()

    if elapsed < 30:
        return 0.15   
    elif elapsed < 60:
        return 0.25  
    elif elapsed < 120:
        return 0.4    
    elif elapsed < 180:
        return 0.6    
    else:
        return 0.8  


# Endpoints

@app.get("/map-data")
def get_map_data() -> List[Dict[str, Any]]:
    """
    Return all configured map zones.
    
    Specific danger zones will have an expanding radius property
    calculated based on the global flood timer.
    """
    flood_radius = get_flood_radius()
    zones: List[Dict[str, Any]] = []

    for zone in ALL_ZONES:
        zone_copy = zone.copy()

        # Dynamic expansion logic for specific danger zone IDs
        if zone_copy["id"] in ["z_danger_1", "z_danger_2", "z_danger_3"]:
            zone_copy["radius"] = flood_radius

        zones.append(zone_copy)

    return zones


@app.post("/navigate")
async def navigate(user: UserLocation) -> Dict[str, Any]:
    """
    Main AI-powered evacuation routing endpoint.
    
    Process Flow:
    1. Select the safest zone based on proximity and penalties.
    2. Compute mathematical ETA.
    3. Generate AI reasoning, instructions, and TTS script (RAG).
    4. Fetch real-world road navigation via OSRM.
    5. Evaluate the decision using LLM-as-a-Judge (Background).
    """
    global fire_start_time

    # Initialize flood timer on the very first request
    if fire_start_time is None:
        fire_start_time = datetime.now()
        print("flood timer started at:", fire_start_time.isoformat())

    total_start = time.time()
    print(f"Incoming request from: {user.lat}, {user.lng}")

    # Categorize Zones
    safe_zones = [z for z in ALL_ZONES if z["type"] == "safe"]
    danger_zones = [z for z in ALL_ZONES if z["type"] == "danger"]
    crowded_zones = [z for z in ALL_ZONES if z["type"] == "crowded"]

    # Score and Select Target Zone
    if not safe_zones:
        # Fallback if no safe zones defined
        target_zone = ALL_ZONES[0] if ALL_ZONES else None
    else:
        # Sort safe zones by calculated score (lower is better)
        scored = [
            (score_safe_zone(user.lat, user.lng, z, danger_zones, crowded_zones), z)
            for z in safe_zones
        ]
        scored.sort(key=lambda s: s[0])
        target_zone = scored[0][1]

    if not target_zone:
        return {"error": "No zones configured"}

    # 3. Compute Metrics
    distance_km = haversine_km(
        user.lat, user.lng,
        target_zone["lat"], target_zone["lng"]
    )
    eta_minutes = compute_eta_minutes(distance_km)

    # AI Generation
    # Load Saudi emergency protocol context for RAG
    protocol_context = load_saudi_protocol()

    ai_response = generate_evacuation_plan(
        context=protocol_context,
        user_lat=user.lat,
        user_lng=user.lng,
        target_zone=target_zone,
        distance_km=distance_km,
        eta_minutes=eta_minutes,
        danger_zones=danger_zones,
        crowded_zones=crowded_zones,
    )

    # Audio Generation (TTS)
    voice_script: str = ai_response.get(
        "voice_script",
        "تم تحديد مسار آمن لك، يرجى اتباع المسار الأخضر على الخريطة بهدوء."
    )
    audio_base64: Optional[str] = await generate_audio_async(voice_script)

    # Real Road Routing (OSRM)
    route = get_real_road_route(
        start_lat=user.lat,
        start_lng=user.lng,
        end_lat=target_zone["lat"],
        end_lng=target_zone["lng"],
    )

    elapsed = time.time() - total_start
    print(f"Navigation completed in {elapsed:.2f}s")

    # Construct Response
    response: Dict[str, Any] = {
        "target_zone": target_zone,
        "route": route,
        "ai_response": ai_response,
        "audio_base64": audio_base64,
        "meta": {
            "distance_km": round(distance_km, 2),
            "eta_minutes": eta_minutes,
            "processing_time_seconds": round(elapsed, 2),
        },
    }

    # Evaluation (LLM-as-a-Judge)
    try:
        zones_for_judge = [
            {
                "id": z.get("id"),
                "name": z.get("name"),
                "type": z.get("type"),
                "status": z.get("status"),
                "lat": z.get("lat"),
                "lng": z.get("lng"),
            }
            for z in ALL_ZONES
        ]
        
        reasoning_ar = ai_response.get("reasoning", "")
        instructions_list = ai_response.get("instructions_list", [])
        instructions_ar = " ".join(instructions_list)[:2000]

        # Construct the payload required by the judge function
        judge_payload = {
            "user_location": {"lat": user.lat, "lng": user.lng},
            "selected_zone": target_zone,
            "all_zones": zones_for_judge,
            "ai_reasoning": reasoning_ar,
            "ai_instructions": instructions_ar,
            "distance_km": round(distance_km, 2),
            "eta_minutes": eta_minutes
        }

        judge_result = evaluate_and_save(judge_payload)
        print("LLM Judge evaluation saved. Overall score:", judge_result.get("overall_score"))

    except Exception as e:
        print(" LLM Judge evaluation failed (Non-blocking error):", e)

    return response


@app.post("/alert-911")
def alert_911(user: UserLocation) -> Dict[str, Any]:
    """
    Simulated emergency SOS endpoint.
    
    Increments the global report counter and returns a case ID
    to the frontend.
    """
    global REPORT_COUNT
    REPORT_COUNT += 1

    return {
        "status": "success",
        "message": "تم مشاركة موقعك بنجاح", 
        "case_id": f"SOS-{REPORT_COUNT}",
        "total_reports": REPORT_COUNT,
    }


@app.get("/dashboard")
def get_stats() -> Dict[str, Any]:
    """
    Return high-level statistics for the admin dashboard.
    """
    global REPORT_COUNT

    return {
        "total_reports": REPORT_COUNT,
        "danger_zones": len([z for z in ALL_ZONES if z["type"] == "danger"]),
        "crowded_zones": len([z for z in ALL_ZONES if z["type"] == "crowded"]),
        "safe_zones": len([z for z in ALL_ZONES if z["type"] == "safe"]),
    }


@app.get("/flood-prediction")
def get_flood_prediction():
    """
    Predict flood spread for 10, 30, and 60-minute intervals.
    
    This endpoint fetches real-time weather data via OpenWeatherMap
    and calculates polygon boundaries for potential flood zones.
    """
    flood_location = (24.7120, 46.6810)  # Faisaliah Tower area
    
    # Initialize predictor
    predictor = FloodSpreadPredictor(
        flood_lat=flood_location[0],
        flood_lng=flood_location[1],
        api_key=OPENWEATHER_API_KEY
    )
    
    print("[API] Fetching weather data...")
    weather = predictor.get_weather()
    print(f"[API] Weather: Wind={weather['wind_speed']}m/s, Temp={weather['temperature']}°C, Humidity={weather['humidity']}%")
    
    print("[API] Running predictions...")
    
    # Generate predictions for different timeframes
    zones_10sec = predictor.predict_spread(10)
    boundary_10sec = predictor.get_prediction_boundary(zones_10sec)
    
    zones_30sec = predictor.predict_spread(30)
    boundary_30sec = predictor.get_prediction_boundary(zones_30sec)
    
    zones_60sec = predictor.predict_spread(60)
    boundary_60sec = predictor.get_prediction_boundary(zones_60sec)
    
    print(f"[API] Complete. Zones: 10s={len(zones_10sec)}, 30s={len(zones_30sec)}, 60s={len(zones_60sec)}")
    
    return {
        "flood_location": {
            "lat": flood_location[0],
            "lng": flood_location[1],
            "name": "برج الفيصلية" 
        },
        "weather": {
            "wind_speed": round(weather['wind_speed'], 1),
            "wind_direction": int(weather['wind_direction']),
            "temperature": round(weather['temperature'], 1),
            "humidity": int(weather['humidity'])
        },
        "predictions": {
            "10min": {
                "zones": zones_10sec,
                "boundary": boundary_10sec,
                "zone_count": len(zones_10sec)
            },
            "30min": {
                "zones": zones_30sec,
                "boundary": boundary_30sec,
                "zone_count": len(zones_30sec)
            },
            "60min": {
                "zones": zones_60sec,
                "boundary": boundary_60sec,
                "zone_count": len(zones_60sec)
            }
        }
    }
