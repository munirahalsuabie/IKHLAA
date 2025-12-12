# Flood spread simulation: fetches real-time weather and predicts flood zones using cellular automata logic.

import numpy as np
import requests
from typing import Dict, List, Optional

class FloodSpreadPredictor:
    """
    A simulation engine that predicts flood spread based on weather conditions
    (wind, humidity, temperature) and terrain logic (downhill flow).
    """

    def __init__(self, flood_lat: float, flood_lng: float, api_key: str):
        """
        Initialize the predictor with the flood origin coordinates and API key.
        
        Args:
            flood_lat (float): Latitude of the flood origin.
            flood_lng (float): Longitude of the flood origin.
            api_key (str): OpenWeatherMap API key.
        """
        self.flood_lat = flood_lat
        self.flood_lng = flood_lng
        self.api_key = api_key

    def predict_spread(self, minutes_ahead: int) -> List[Dict]:
        """
        Predict the flood spread area for a specific duration in the future.
        
        Args:
            minutes_ahead (int): Duration of the simulation in minutes (e.g., 10, 30, 60).
        
        Returns:
            List[Dict]: A list of coordinates {'lat': float, 'lng': float} representing flooded cells.
        """
        # 1. Fetch real-time weather data
        weather = self.get_weather()
        
        # 2. Run the cellular automata simulation
        predicted_zones = self.run_simulation(
            wind_speed=weather['wind_speed'],
            wind_direction=weather['wind_direction'],
            temperature=weather['temperature'],
            humidity=weather['humidity'],
            duration_minutes=minutes_ahead
        )
        
        return predicted_zones

    def get_weather(self) -> Dict:
        """
        Fetch real-time weather data from OpenWeatherMap API.
        
        Returns:
            Dict: Contains wind_speed (m/s), wind_direction (deg), temperature (C), humidity (%).
            Returns default values if the API call fails.
        """
        url = "https://api.openweathermap.org/data/2.5/weather"
        params = {
            'lat': self.flood_lat,
            'lon': self.flood_lng,
            'appid': self.api_key,
            'units': 'metric'
        }
        
        try:
            response = requests.get(url, params=params, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            return {
                'wind_speed': data.get('wind', {}).get('speed', 3.0),
                'wind_direction': data.get('wind', {}).get('deg', 0),
                'temperature': data.get('main', {}).get('temp', 35.0),
                'humidity': data.get('main', {}).get('humidity', 30)
            }
        except Exception as e:
            print(f"[WARN] Weather API failed: {e}. Using default weather values.")
            return {
                'wind_speed': 3.0,      # Default light breeze
                'wind_direction': 0,    # North
                'temperature': 35.0,    # Hot
                'humidity': 30          # Dry
            }

    def run_simulation(self, wind_speed: float, wind_direction: float,
                       temperature: float, humidity: float,
                       duration_minutes: int) -> List[Dict]:
        """
        Run a Cellular Automata (CA) simulation to model flood spread.
        
        Physics Logic:
        - Water flows primarily downhill (simulated by a fixed 'downhill_angle').
        - Wind pushes surface water slightly.
        - Rainfall (humidity) increases spread probability.
        - High temperature increases evaporation (drainage), slowing spread.
        """
        
        # --- Grid Configuration ---
        grid_size = 50          # 50x50 grid
        cell_size_m = 100       # Each cell is 100 meters
        grid = np.zeros((grid_size, grid_size))
        
        # Start flood at the center
        center = grid_size // 2
        grid[center, center] = 1
        
        # --- Physics Parameters ---
        # Base rate: Floods spread faster than fires initially
        base_spread_rate = 0.15  # 15% probability per neighbor per minute
        
        # Environmental Factors
        wind_factor = 1.0 + (wind_speed / 20.0)      # Wind assists spread slightly
        rainfall_factor = 1.0 + (humidity / 50.0)    # High humidity = heavier rain = faster spread
        drainage_factor = 1.0 - (temperature / 100.0) # Hotter = faster evaporation = slower spread
        
        # Combined probability
        spread_probability = base_spread_rate * wind_factor * rainfall_factor * drainage_factor
        spread_probability = min(max(spread_probability, 0.1), 0.9) # Clamp between 10% and 90%
        
        print(f"[FLOOD SIM] Spread probability: {spread_probability:.2%} per minute")
        
        # --- Simulation Loop (Minute by Minute) ---
        for _ in range(duration_minutes):
            new_grid = grid.copy()
            
            for i in range(grid_size):
                for j in range(grid_size):
                    # If cell is flooded, try to spread to neighbors
                    if grid[i, j] == 1:
                        for di in [-1, 0, 1]:
                            for dj in [-1, 0, 1]:
                                if di == 0 and dj == 0:
                                    continue
                                    
                                ni, nj = i + di, j + dj
                                
                                # Check bounds
                                if 0 <= ni < grid_size and 0 <= nj < grid_size:
                                    # Calculate neighbor direction angle
                                    angle = np.arctan2(dj, di) * 180 / np.pi
                                    
                                    # --- Topography Logic (Downhill Flow) ---
                                    # We assume 200 degrees (South-West) is downhill for this demo location
                                    downhill_angle = 200 
                                    elevation_diff = abs((angle - downhill_angle + 180) % 360 - 180)
                                    
                                    if elevation_diff < 60:
                                        direction_factor = 3.0  # Downhill: Fast flow
                                    elif elevation_diff < 120:
                                        direction_factor = 1.0  # Lateral: Normal flow
                                    else:
                                        direction_factor = 0.3  # Uphill: Very slow flow
                                    
                                    # --- Wind Logic ---
                                    # Wind pushes water in its direction
                                    angle_diff = abs((angle - wind_direction + 180) % 360 - 180)
                                    wind_bias = 1.2 if angle_diff < 45 else 0.9
                                    direction_factor *= wind_bias
                                    
                                    # --- Randomness (Terrain Roughness) ---
                                    noise = np.random.uniform(0.7, 1.3)  # +/- 30% variation
                                    
                                    # Final Check
                                    final_prob = spread_probability * direction_factor * noise
                                    if np.random.random() < final_prob:
                                        new_grid[ni, nj] = 1
            
            grid = new_grid
        
        # --- Convert Grid to Lat/Lng ---
        predicted_zones = []
        meters_per_degree_lat = 111000
        meters_per_degree_lng = 111000 * np.cos(np.radians(self.flood_lat))
        
        for i in range(grid_size):
            for j in range(grid_size):
                if grid[i, j] == 1:
                    lat_offset = (i - center) * cell_size_m
                    lng_offset = (j - center) * cell_size_m
                    
                    lat = self.flood_lat + (lat_offset / meters_per_degree_lat)
                    lng = self.flood_lng + (lng_offset / meters_per_degree_lng)
                    
                    predicted_zones.append({'lat': lat, 'lng': lng})
        
        return predicted_zones

    def get_prediction_boundary(self, zones: List[Dict]) -> Dict:
        """
        Calculate an elliptical bounding area that encompasses the flood spread.
        This is useful for rendering the flood zone on a map UI.
        
        Returns:
            Dict: Contains center, radius (avg), major/minor axis, and rotation.
        """
        if not zones:
            # Default fallback if no spread
            return {
                'center': [self.flood_lat, self.flood_lng],
                'radius': 0.3,
                'type': 'ellipse',
                'major_axis': 0.4,
                'minor_axis': 0.2,
                'rotation': 200
            }
        
        lats = [z['lat'] for z in zones]
        lngs = [z['lng'] for z in zones]
        
        center_lat = (max(lats) + min(lats)) / 2
        center_lng = (max(lngs) + min(lngs)) / 2
        
        # Calculate physical spread in km
        lat_spread_km = (max(lats) - min(lats)) * 111
        lng_spread_km = (max(lngs) - min(lngs)) * 111 * np.cos(np.radians(center_lat))
        
        # Shape Logic: Floods are usually elongated (Ellipses)
        # We assume the major axis aligns with the downhill direction (200 degrees)
        max_spread = max(lat_spread_km, lng_spread_km)
        min_spread = min(lat_spread_km, lng_spread_km)
        
        major_axis = max_spread * 1.5  # Elongate further downhill
        minor_axis = min_spread * 0.7  # Compress laterally (channel effect)
        
        # Average radius is kept for backward compatibility with simple Circle layers
        radius_km = (major_axis + minor_axis) / 2
        
        return {
            'center': [center_lat, center_lng],
            'radius': radius_km,
            'type': 'ellipse',
            'major_axis': major_axis,
            'minor_axis': minor_axis,
            'rotation': 200  # Downhill direction in degrees (South-West)
        }