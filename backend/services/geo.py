# Geographic helpers: distance, scoring, ETA, and direction text.

import math
from typing import Dict, List

from config import WALKING_SPEED_KMH, MIN_ETA_MINUTES
from config import EVAC_SPEED_KMH, MIN_ETA_MINUTES  


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Compute the great-circle distance between two points in kilometers
    using the Haversine formula.
    """
    r_earth = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)

    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(
        d_lambda / 2
    ) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r_earth * c


def score_safe_zone(
    user_lat: float,
    user_lng: float,
    zone: Dict,
    danger_zones: List[Dict],
    crowded_zones: List[Dict],
) -> float:
    """
    Score a safe zone based on:
    - Distance from the user (closer is better).
    - Penalties if the zone is too close to danger or crowded zones.

    Lower score = more suitable.
    """
    dist = haversine_km(user_lat, user_lng, zone["lat"], zone["lng"])

    min_danger = min(
        (haversine_km(zone["lat"], zone["lng"], d["lat"], d["lng"]) for d in danger_zones),
        default=999.0,
    )
    min_crowded = min(
        (haversine_km(zone["lat"], zone["lng"], c["lat"], c["lng"]) for c in crowded_zones),
        default=999.0,
    )

    penalty = 0.0
    # Strong penalty if the safe zone is too close to a danger zone.
    if min_danger < 2.0:
        penalty += (2.0 - min_danger) * 20.0
    # Smaller penalty if the safe zone is very close to crowded areas.
    if min_crowded < 1.0:
        penalty += (1.0 - min_crowded) * 10.0

    return dist + penalty


def compute_eta_minutes(distance_km: float) -> int:
    """
    Compute an estimated time in minutes based on evacuation speed.

    Uses a driving-like speed for city evacuation, plus simple rules so that
    very short distances do not produce unrealistic ETAs.
    """
    if distance_km <= 0:
        return MIN_ETA_MINUTES

    # Simple heuristic for short distances 
    if distance_km <= 1.0:
        return 3  # very close
    elif distance_km <= 3.0:
        return 5  # short hop
    elif distance_km <= 5.0:
        return 10  # still quite close
    elif distance_km <= 10.0:
        return 15  # within city, reasonable drive

    # For longer distances, use the configured speed.
    hours = distance_km / max(EVAC_SPEED_KMH, 0.1)
    minutes = round(hours * 60.0)
    return max(minutes, MIN_ETA_MINUTES)


def direction_from_user_to_target(
    user_lat: float, user_lng: float, target_lat: float, target_lng: float
) -> str:
    """
    Approximate the cardinal direction from user to target.

    Returns:
        Arabic phrase such as 'باتجاه الشمال الشرقي'.
    """
    d_lat = target_lat - user_lat  # north-south
    d_lng = target_lng - user_lng  # east-west

    if abs(d_lat) < 1e-5 and abs(d_lng) < 1e-5:
        return "بالقرب منك مباشرة"

    vertical = ""
    horizontal = ""

    if d_lat > 0:
        vertical = "الشمال"
    elif d_lat < 0:
        vertical = "الجنوب"

    if d_lng > 0:
        horizontal = "الشرق"
    elif d_lng < 0:
        horizontal = "الغرب"

    if vertical and horizontal:
        return f"باتجاه {vertical} الشرقي" if horizontal == "الشرق" else f"باتجاه {vertical} الغربي"
    elif vertical:
        return f"باتجاه {vertical}"
    elif horizontal:
        return f"باتجاه {horizontal}"
    else:
        return "باتجاه غير محدد"
