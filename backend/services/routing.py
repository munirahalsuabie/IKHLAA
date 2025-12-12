# Route generation using OSRM. Returns a list of [lat, lng] points.

from typing import List
import requests
from config import OSRM_BASE_URL


def get_real_road_route(
    start_lat: float, start_lng: float, end_lat: float, end_lng: float
) -> List[list]:
    """
    Call the OSRM public server to compute a realistic road route.

    If OSRM fails or returns a non-OK status, fall back to a simple
    straight line from start to end.

    Returns:
        A list of [lat, lng] coordinates representing the route.
    """
    try:
        url = (
            f"{OSRM_BASE_URL}/route/v1/driving/"
            f"{start_lng},{start_lat};{end_lng},{end_lat}"
            f"?overview=full&geometries=geojson"
        )
        response = requests.get(url, timeout=2)
        data = response.json()
        if data.get("code") != "Ok":
            return [[start_lat, start_lng], [end_lat, end_lng]]

        coords = data["routes"][0]["geometry"]["coordinates"]
        # OSRM returns [lng, lat]; convert to [lat, lng].
        return [[p[1], p[0]] for p in coords]
    except Exception as exc:
        print(f"OSRM error: {exc}")
        return [[start_lat, start_lng], [end_lat, end_lng]]
