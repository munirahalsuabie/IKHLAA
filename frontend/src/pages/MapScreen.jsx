import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap } from 'react-leaflet';
import {
  Navigation,
  ShieldAlert,
  MapPin,
  Volume2,
  Share2,
  Activity,
  Clock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- ICONS: user blue dot ---
const createBlueDotIcon = () =>
  L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-12 h-12 bg-blue-500/20 rounded-full animate-pulse"></div>
        <div class="absolute w-4 h-4 bg-[#007AFF] border-2 border-white rounded-full shadow-lg"></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

// --- ICONS: radar marker for zones (danger/crowded/safe) ---
const createRadarIcon = (type) => {
  const color =
    type === 'danger' ? '#EF4444' : type === 'crowded' ? '#EAB308' : '#22C55E';

  return L.divIcon({
    className: 'custom-radar',
    html: `
      <div class="relative flex items-center justify-center">
        <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full opacity-75" style="background-color: ${color}"></span>
        <span class="relative inline-flex rounded-full h-4 w-4 border-2 border-white shadow-lg" style="background-color: ${color}"></span>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

// --- Map controller: smoothly fly to center + zoom ---
const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 13, { animate: true, duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
};

const MapScreen = () => {
  // --- STATIC USER LOCATION (for demo) ---
  // Change STATIC_POS if you want a different default user location
  const STATIC_POS = [24.7150, 46.6800];

  const [userPos] = useState(STATIC_POS);
  const [mapCenter, setMapCenter] = useState(STATIC_POS);
  const [mapZoom, setMapZoom] = useState(12);

  // --- BACKEND DATA ---
  const [zones, setZones] = useState([]);
  const [routeLine, setRouteLine] = useState([]);
  const [targetZone, setTargetZone] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);

  // --- AI STATE (reason + step-by-step instructions) ---
  const [aiReason, setAiReason] = useState('');
  const [instructionsList, setInstructionsList] = useState([]);
  const [currentInstIndex, setCurrentInstIndex] = useState(0);
  const [etaMinutes, setEtaMinutes] = useState(null);

  // --- AUDIO STATE ---
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  // --- UI STATE ---
  const [isOpen, setIsOpen] = useState(true);      // bottom sheet open/closed
  const [isSharing, setIsSharing] = useState(false); // SOS button loading
  const [sosData, setSosData] = useState(null);     // SOS toast data
  const [isNavigating, setIsNavigating] = useState(false); // mini-nav mode

  // --- Fetch zones from backend (fire expansion, etc.) ---
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/map-data');
        const data = await res.json();
        setZones(data);
      } catch (e) {
        console.error('Error loading zones:', e);
      }
    };

    fetchZones();
    // Refresh zones every 5 seconds to reflect dynamic hazard changes
    const interval = setInterval(fetchZones, 5000);
    return () => clearInterval(interval);
  }, []);

  // --- Rotate instructions (top banner) every 6 seconds ---
  useEffect(() => {
    if (instructionsList.length > 0) {
      const interval = setInterval(() => {
        setCurrentInstIndex((prev) => (prev + 1) % instructionsList.length);
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [instructionsList]);

  // --- Handle audio ended ---
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => setIsPlaying(false);
    }
  }, [audioRef.current]);

  // --- Start navigation once on mount (using static user position) ---
  useEffect(() => {
    startNavigation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Call /navigate to get safest target zone + route + AI explanation + TTS ---
  const startNavigation = async () => {
    try {
      setAiReason('جاري تحليل الموقف...');

      const response = await fetch('http://127.0.0.1:8000/navigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: userPos[0], lng: userPos[1] }),
      });

      const data = await response.json();

      setTargetZone(data.target_zone);
      setRouteLine(data.route || []);
      setDistanceKm(data.meta?.distance_km ?? null);

      if (data.ai_response) {
        setAiReason(data.ai_response.reasoning || '');
        setInstructionsList(data.ai_response.instructions_list || []);
        setEtaMinutes(data.ai_response.eta_minutes || null);
      }

      setIsOpen(true);

      // Prepare audio from base64 if available
      if (data.audio_base64) {
        const audioSrc = `data:audio/mpeg;base64,${data.audio_base64}`;
        audioRef.current = new Audio(audioSrc);
        audioRef.current.onended = () => setIsPlaying(false);
        console.log(' Audio ready');
      } else {
        console.warn(' No audio_base64 from backend');
      }
    } catch (error) {
      console.error(error);
      alert('خطأ في الاتصال مع خادم الإخلاء');
    }
  };

  // --- Toggle audio play/pause from Volume icon ---
  const toggleAudio = (e) => {
    e.stopPropagation();
    if (!audioRef.current) {
      console.warn(' Audio not ready yet');
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error('Audio play error:', err));
    }
  };

  // --- Start navigation: collapse sheet to mini-nav, zoom to user, play audio ---
  const handleStart = (e) => {
    e.stopPropagation();

    setIsOpen(false);
    setIsNavigating(true);

    // Focus map on user location
    setMapCenter(userPos);
    setMapZoom(16);

    // Play from the beginning
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.error('Audio play error:', err));
    } else {
      console.warn(' Audio not ready when pressing start');
    }
  };

  // --- Stop navigation: return to full bottom sheet, stop audio ---
  const handleStopNavigation = (e) => {
    e.stopPropagation();

    setIsNavigating(false);
    setIsOpen(true);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  // --- Send SOS to /alert-911 (Fire Dept / Command Center) ---
  const handleShare = async (e) => {
    e.stopPropagation();
    setIsSharing(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/alert-911', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: userPos[0], lng: userPos[1] }),
      });
      const data = await response.json();
      setSosData(data);
      setTimeout(() => setSosData(null), 5000);
    } catch (error) {
      console.error('SOS error:', error);
    } finally {
      setIsSharing(false);
    }
  };

  // --- Distance text for bottom sheet ---
  const distanceText =
    distanceKm != null
      ? `يبعد تقريبًا ${distanceKm.toFixed(1)} كم عن موقعك`
      : '';

  // Distance as plain number for mini navigation UI
  const distance = distanceKm != null ? distanceKm.toFixed(1) : '';

  // Current time (for mini navigation view)
  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // --- Expanding hazard zones (animated red auras around specific ids) ---
  const dangerZones = zones.filter((z) => z.type === 'danger');
  const expandingZones = dangerZones.filter((z) =>
    ['z_danger_1', 'z_danger_2', 'z_danger_3'].includes(z.id)
  );

  return (
    <div
      className="h-full w-full relative bg-white overflow-hidden font-sans text-gray-900"
      dir="rtl"
    >
      {/* MAP LAYER */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          zoomControl={false}
          className="h-full w-full bg-[#f8fafc]"
        >
          <TileLayer
            attribution="&copy; CARTO"
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {/* Expanding hazard circles for key danger zones */}
          {targetZone &&
            expandingZones.map((zone) => {
              let expansionMultiplier = 1.0;
              if (zone.id === 'z_danger_1') expansionMultiplier = 1.0;
              else if (zone.id === 'z_danger_2') expansionMultiplier = 0.7;
              else if (zone.id === 'z_danger_3') expansionMultiplier = 1.05;

              const currentRadius = (zone.radius || 1) * expansionMultiplier;

              return (
                <Circle
                  key={`danger-aura-${zone.id}`}
                  center={[zone.lat, zone.lng]}
                  radius={currentRadius * 1000}
                  pathOptions={{
                    stroke: false,
                    fillColor: '#EF4444',
                    fillOpacity: 0.2,
                  }}
                />
              );
            })}

          {/* Zone markers */}
          {zones.map((zone) => (
            <Marker
              key={zone.id}
              position={[zone.lat, zone.lng]}
              icon={createRadarIcon(zone.type)}
            />
          ))}

          {/* Evacuation route polyline */}
          {routeLine.length > 0 && (
            <Polyline
              positions={routeLine}
              pathOptions={{
                color: '#007AFF',
                weight: 6,
                opacity: 0.9,
                lineCap: 'round',
              }}
            />
          )}

          {/* Static user location marker */}
          <Marker position={userPos} icon={createBlueDotIcon()} />

          {/* Map controller for smooth fly-to transitions */}
          <MapController center={mapCenter} zoom={mapZoom} />
        </MapContainer>
      </div>

      {/* TOP: Emergency banner + rotating instructions */}
      <div className="absolute top-14 left-0 right-0 px-4 z-10 flex justify-center pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md text-red-600 pl-6 pr-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 w-full max-w-sm pointer-events-auto border border-red-100 animate-slide-down">
          <ShieldAlert size={24} className="animate-pulse fill-red-100" />
          <div className="flex-1">
            <h2 className="font-bold text-sm text-gray-900">حالة طوارئ نشطة</h2>
            <p className="text-xs text-gray-600 mt-0.5 min-h-[20px] transition-all duration-500">
              {instructionsList.length > 0
                ? instructionsList[currentInstIndex]
                : 'إخلاء قيد التحليل...'}
            </p>
          </div>
        </div>
      </div>

      {/* SOS TOAST */}
      {sosData && (
        <div className="absolute top-32 left-4 right-4 z-50 animate-fade-in">
          <div className="bg-[#006C35] text-white p-4 rounded-2xl shadow-xl flex items-start gap-3">
            <Share2 size={20} className="mt-1" />
            <div>
              <h3 className="font-bold text-lg">تم إرسال البلاغ</h3>
              <p className="text-emerald-100 text-sm">{sosData.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM SHEET */}
      <motion.div
        initial={{ y: '80%' }}
        animate={{ y: isOpen ? 0 : isNavigating ? 'calc(100% - 140px)' : '80%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="absolute bottom-0 left-0 right-0 z-20"
      >
        <div
          onClick={() => !isNavigating && setIsOpen(!isOpen)}
          className={`bg-white/98 backdrop-blur-xl rounded-t-[28px] shadow-[0_-4px_24px_rgba(0,0,0,0.12)] px-5 py-4 h-full border-t-2 border-gray-100 ${
            !isNavigating ? 'cursor-pointer' : ''
          }`}
        >
          {/* handle for dragging */}
          {!isNavigating && (
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
          )}

          {targetZone ? (
            isNavigating ? (
              // --- MINI NAVIGATION VIEW (compact mode while walking) ---
              <div className="space-y-0">
                <div className="flex items-center justify-between gap-3">
                  {/* Time & ETA */}
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-[32px] font-bold text-[#34C759] leading-none">
                        {etaMinutes ?? '--'}
                      </span>
                      <span className="text-lg font-semibold text-[#34C759]">
                        دقيقة
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      {distance && (
                        <>
                          <span className="font-medium">{distance} كم</span>
                          <span>•</span>
                        </>
                      )}
                      <span className="text-xs">{getCurrentTime()}</span>
                    </div>
                  </div>

                  {/* Direction arrow placeholder (could be replaced by heading) */}
                  <button className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="text-gray-700"
                    >
                      <path d="M12 19V5M5 12l7-7 7 7" />
                    </svg>
                  </button>

                  {/* AUDIO TOGGLE BUTTON */}
                  <button
                    onClick={toggleAudio}
                    className={`p-3 rounded-full transition-all border ${
                      isPlaying
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-gray-100 text-blue-600 border-gray-200 hover:bg-blue-50'
                    }`}
                  >
                    {isPlaying ? (
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-3 bg-white animate-pulse" />
                        <div className="w-1 h-5 bg-white animate-pulse delay-75" />
                        <div className="w-1 h-3 bg-white animate-pulse" />
                      </div>
                    ) : (
                      <Volume2 size={24} />
                    )}
                  </button>

                  {/* STOP NAV BUTTON */}
                  <button
                    onClick={handleStopNavigation}
                    className="px-6 py-3 bg-[#FF3B30] text-white rounded-full font-bold text-base hover:bg-[#E6352A] transition-colors shadow-md"
                  >
                    إنهاء
                  </button>
                </div>
              </div>
            ) : (
              // --- FULL EXPANDED VIEW (before starting navigation) ---
              <>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 mb-1">
                      {targetZone.name}
                    </h2>
                    <p className="text-green-600 text-sm font-medium flex items-center gap-1">
                      <MapPin size={16} /> المنطقة الآمنة المختارة
                    </p>
                    {distanceText && (
                      <p className="text-xs text-gray-500 mt-1">{distanceText}</p>
                    )}
                    {etaMinutes && (
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <Clock size={12} /> الوقت التقديري للوصول: {etaMinutes} دقيقة
                      </p>
                    )}
                  </div>

                  {/* AUDIO TOGGLE BUTTON */}
                  <button
                    onClick={toggleAudio}
                    className={`p-3 rounded-full transition-all border ${
                      isPlaying
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-gray-100 text-blue-600 border-gray-200 hover:bg-blue-50'
                    }`}
                  >
                    {isPlaying ? (
                      <div className="flex items-center gap-1">
                        <div className="w-1 h-3 bg-white animate-pulse" />
                        <div className="w-1 h-5 bg-white animate-pulse delay-75" />
                        <div className="w-1 h-3 bg-white animate-pulse" />
                      </div>
                    ) : (
                      <Volume2 size={24} />
                    )}
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Reason / explanation card */}
                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl">
                    <h3 className="font-bold text-blue-800 text-xs mb-1 flex items-center gap-2">
                      <Activity size={12} />
                      سبب اختيار المسار
                    </h3>
                    <p className="text-sm text-gray-800 font-medium leading-relaxed">
                      {aiReason || 'يتم الآن توليد تفسير المسار الآمن...'}
                    </p>
                  </div>

                  {/* Actions: SOS + Start */}
                  <div className="flex gap-3 mt-1">
                    <button
                      onClick={handleShare}
                      disabled={isSharing}
                      className={`flex-1 py-4 rounded-xl font-bold border ${
                        isSharing
                          ? 'bg-gray-100 text-gray-400'
                          : 'bg-white text-blue-700 border-blue-100 hover:bg-blue-50'
                      }`}
                    >
                      {isSharing ? (
                        '...'
                      ) : (
                        <>
                          <MapPin size={18} className="inline ml-2" />
                          إرسال بلاغ
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleStart}
                      className="flex-1 bg-[#007AFF] text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
                    >
                      <Navigation size={18} /> البدء
                    </button>
                  </div>
                </div>
              </>
            )
          ) : (
            // --- LOADING STATE: waiting for /navigate ---
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-2 animate-pulse">
                <ShieldAlert size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                جاري تحليل مسار الإخلاء
              </h3>
              <p className="text-gray-500 text-sm px-4">
                يعمل المساعد الذكي &quot;إخلاء&quot; الآن على اختيار أفضل مسار آمن لك...
              </p>

              <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mt-2">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0.15s]" />
                <span className="w-2 h-2 bg-gray-200 rounded-full animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default MapScreen;
