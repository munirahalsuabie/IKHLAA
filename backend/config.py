# Global configuration for the IKHLAA backend.

import os

# Groq API key 
GROQ_API_KEY = ""
# AI model configuration
AI_MODEL = "allam-2-7b" 
JUDGE_MODEL = "llama-3.3-70b-versatile"

# OSRM routing server base URL
OSRM_BASE_URL = "http://router.project-osrm.org"

# Evacuation speed assumptions
WALKING_SPEED_KMH = 4.0

# Driving-like evacuation speed inside the city (km/h)
EVAC_SPEED_KMH = 40.0

# Minimum ETA in minutes 
MIN_ETA_MINUTES = 3

# OpenWeather API key for fire prediction / weather integration
OPENWEATHER_API_KEY = ""

