# Static configured zones around Riyadh:
# - "danger": high-risk areas (e.g., active fire)
# - "crowded": high-density human presence
# - "safe": candidate evacuation / assembly points

ALL_ZONES = [
    # --- Danger zones (Red) ---
    {
        "id": "z_danger_1",
        "name": "فندق جي دبليو ماريوت",
        "lat": 24.794925,
        "lng": 46.631998,
        "type": "danger",
        "radius": 1,
    },
    {
        "id": "z_danger_2",
        "name": "الرياض بارك",
        "lat": 24.756676,
        "lng": 46.629279,
        "type": "danger",
        "radius": 1,
    },
    {
        "id": "z_danger_3",
        "name": "صحارى مول",
        "lat": 24.741623252390212,
        "lng": 46.68242920722131,
        "type": "danger",
        "radius": 1,
    },

    # --- Crowded zones (Yellow) ---
    {
        "id": "z_crowd_1",
        "name": "حديقة الملك سلمان",
        "lat": 24.729325746876825,
        "lng": 46.70088757967561,
        "type": "crowded",
        "radius": 1,
    },
    {
        "id": "z_crowd_2",
        "name": " السوليتير",
        "lat": 24.802676,
        "lng": 46.650391,
        "type": "crowded",
        "radius": 1,
    },
    {
        "id": "z_crowd_3",
        "name": "ممشى الغدير",
        "lat": 24.779551,
        "lng": 46.642615,
        "type": "crowded",
        "radius": 1,
    },

    # --- Safe zones (Green) ---
    {
        "id": "z_safe_1",
        "name": "المدرسة المتوسطة 177",
        "lat": 24.790393,
        "lng": 46.645407,
        "type": "safe",
        "radius": 1,
    },
    {
        "id": "z_safe_2",
        "name": " ثانوية الأمير عبدالمجيد",
        "lat": 24.750984,
        "lng": 46.65005,
        "type": "safe",
        "radius": 1,
    },
    {
        "id": "z_safe_3",
        "name": "مستشفى الحبيب",
        "lat": 24.813232,
        "lng": 46.624900,
        "type": "safe",
        "radius": 1,
    },
]

