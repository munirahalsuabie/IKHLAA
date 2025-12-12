// // Emergency analytics & fire spread prediction dashboard.
// // Includes:
// // - Top KPIs
// // - Live environment widget
// // - Fire spread prediction map
// // - SOS trend chart
// // - Live rescue requests table

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

import {
  ArrowLeft,
  Radio,
  ShieldCheck,
  Truck,
  Activity,
  Wind,
  Users,
  MapPin,
  AlertTriangle,
  Droplets
} from 'lucide-react';

// --- Logic: Generate Ellipse for Flood Flow ---
const generateEllipsePoints = (center, majorAxisKm, minorAxisKm, rotationDeg, numPoints = 64) => {
  const points = [];
  const angleRad = (rotationDeg * Math.PI) / 180;
  
  for (let i = 0; i <= numPoints; i++) {
    const theta = (i / numPoints) * 2 * Math.PI;
    
    // Ellipse in local coordinates
    const x = majorAxisKm * Math.cos(theta);
    const y = minorAxisKm * Math.sin(theta);
    
    // Rotate
    const xRot = x * Math.cos(angleRad) - y * Math.sin(angleRad);
    const yRot = x * Math.sin(angleRad) + y * Math.cos(angleRad);
    
    // Convert km to lat/lng
    const lat = center[0] + (yRot / 111);
    const lng = center[1] + (xRot / (111 * Math.cos((center[0] * Math.PI) / 180)));
    
    points.push([lat, lng]);
  }
  
  return points;
};

// --- Color palette ---
const COLORS = {
  deepForest: '#051f18',
  primaryGreen: '#0d3829',
  forestShadow: '#082d21',
  successGreen: '#2a9d6f',
  mintHighlight: '#7ef5c8',
  deepEmerald: '#1e7552',

  cardBgDark: '#0d1a14',
  panelBg: '#101f1a',
  elementBg: '#142520',
  deepShadow: '#030a08',
  surfaceDark: '#0a1812',
  navigationDark: '#0d251c',

  primaryText: '#ffffff',
  secondaryText: '#e8f5ee',
  mutedText: '#d0e8dc',
  subtleText: '#b8dcc9',

  criticalRed: '#d32f2f',
  deepAlertRed: '#b71c1c',
  dangerMarker: '#ff6b6b',
  floodZone: '#ff4444',
  warningOrange: '#ff9800',
  evacuatingYellow: '#ffd54f',

  medicalBlue: '#3b82f6',
  logisticsPurple: '#a855f7'
};

// --- Mock data: SOS trend ---
const sosTrendData = [
  { time: '00:00', signals: 5 },
  { time: '04:00', signals: 2 },
  { time: '08:00', signals: 12 },
  { time: '12:00', signals: 45 },
  { time: '13:00', signals: 89 },
  { time: '14:00', signals: 156 },
  { time: '15:00', signals: 130 }
];

// --- Mock data: Live rescue requests ---
const rescueRequests = [
  {
    id: 'SOS-8821',
    type: 'احتجاز في مبنى',
    location: 'حي العقيق - شارع 14',
    time: 'منذ 5 د',
    status: 'جاري الإنقاذ',
    units: 'فرقة إخلاء 4'
  },
  {
    id: 'SOS-8822',
    type: 'إصابة حرجة',
    location: 'طريق الملك فهد',
    time: 'منذ 8 د',
    status: 'تم الوصول',
    units: 'إسعاف الهلال الأحمر'
  },
  {
    id: 'SOS-8823',
    type: 'تكدس عائلات',
    location: 'مخرج 5',
    time: 'منذ 12 د',
    status: 'جاري التوجيه',
    units: 'بانتظار توفر وحدة'
  },
  {
    id: 'SOS-8825',
    type: 'فيضان شوارع',
    location: 'النفق الجنوبي',
    time: 'منذ 15 د',
    status: 'تم التعامل',
    units: 'دفاع مدني'
  },
  {
    id: 'SOS-8826',
    type: 'انقطاع طرق',
    location: 'حي الملز',
    time: 'منذ 18 د',
    status: 'جاري التعامل',
    units: 'طوارئ البنية'
  },
  {
    id: 'SOS-8827',
    type: 'انقطاع كهرباء',
    location: 'المستشفى التخصصي',
    time: 'منذ 20 د',
    status: 'تم الحل',
    units: 'شركة الكهرباء'
  }
];

// --- Map Icon ---
const createFloodIcon = () =>
  L.divIcon({
    className: 'flood-marker',
    html:
      '<div style="width: 20px; height: 20px; background: #3B82F6; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(59,130,246,0.8);"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

// Map Controller
const MapController = ({ center }) => {
  const map = useMap();
  React.useEffect(() => {
    if (center && center[0] != null && center[1] != null) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
};

// Stat Card
const StatCard = ({ icon: Icon, label, value, color, subtext }) => (
  <div
    className="p-3 rounded-xl shadow-lg flex items-center justify-between min-w-[180px]"
    style={{
      background: `linear-gradient(145deg, ${COLORS.cardBgDark} 0%, ${COLORS.deepShadow} 100%)`,
      borderRight: `3px solid ${color}`
    }}
  >
    <div>
      <p
        className="text-[10px] font-bold mb-1 opacity-80"
        style={{ color: COLORS.mutedText }}
      >
        {label}
      </p>
      <h3
        className="text-xl font-black font-mono"
        style={{ color: COLORS.primaryText }}
      >
        {value}
      </h3>
      {subtext && (
        <p
          className="text-[10px] mt-1 opacity-70"
          style={{ color: COLORS.subtleText }}
        >
          {subtext}
        </p>
      )}
    </div>
    <div
      className="p-2 rounded-full"
      style={{ backgroundColor: `${color}20` }}
    >
      <Icon size={20} style={{ color }} />
    </div>
  </div>
);

const Analysis = () => {
  const navigate = useNavigate();

  const [timeFilter, setTimeFilter] = useState('مباشر');
  const [floodLoading, setFloodLoading] = useState(true);
  const [floodData, setFloodData] = useState(null);
  const [selectedTime, setSelectedTime] = useState('30min');

  const [weatherLive, setWeatherLive] = useState({
    wind: 6.5,
    direction: 35,
    rainfall: 'معتدلة',
    drainage: 'جيد'
  });

  const floodLocation = floodData?.fire_location;
  const currentPred = floodData?.predictions?.[selectedTime];

  // Fetch Data
  useEffect(() => {
    const fetchFloodData = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/flood-prediction');
        const result = await res.json();
        setFloodData(result);
        setFloodLoading(false);
      } catch (err) {
        console.error('Flood prediction fetch error:', err);
        const defaultCenter = [24.712, 46.681];
        setFloodData({
          fire_location: { lat: defaultCenter[0], lng: defaultCenter[1], name: 'وسط الرياض' },
          predictions: {
            '10min': { boundary: { center: defaultCenter, radius: 1.2 }, zone_count: 150 },
            '30min': { boundary: { center: defaultCenter, radius: 2.4 }, zone_count: 600 },
            '60min': { boundary: { center: defaultCenter, radius: 3.6 }, zone_count: 1200 }
          },
          weather: { wind_speed: 5, temperature: 35, humidity: 30 }
        });
        setFloodLoading(false);
      }
    };

    fetchFloodData();
    const interval = setInterval(fetchFloodData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Weather Jitter
  useEffect(() => {
    const interval = setInterval(() => {
      setWeatherLive(prev => ({
        ...prev,
        wind: Math.max(3, prev.wind + (Math.random() - 0.5)),
        rainfall: Math.random() > 0.5 ? 'غزيرة' : 'معتدلة',
        drainage: Math.random() > 0.7 ? 'ضعيف' : 'جيد'
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // --- New Logic for Color Gradient (Yellow -> Orange -> Red) ---
  const getPolygonColor = (time) => {
    switch (time) {
      case '10min':
        return '#FACC15'; // Yellow 
      case '30min':
        return '#F97316'; // Orange 
      case '60min':
        return '#DC2626'; // Red 
      default:
        return '#EF4444';
    }
  };

  const currentColor = getPolygonColor(selectedTime);

  return (
    <div
      className="h-screen w-screen text-white font-sans p-4 overflow-hidden flex flex-col gap-3"
      style={{
        background: `linear-gradient(135deg, ${COLORS.deepForest} 0%, ${COLORS.primaryGreen} 50%, ${COLORS.deepShadow} 100%)`
      }}
      dir="rtl"
    >
      {/* --- Header --- */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shadow-lg bg-gradient-to-br from-emerald-600 to-emerald-900">
            <ShieldCheck size={20} style={{ color: COLORS.mintHighlight }} />
          </div>
          <div>
            <h1
              className="text-base font-bold tracking-wide"
              style={{ color: COLORS.mintHighlight }}
            >
              المنصة الوطنية للإنذار المبكر
            </h1>
            <p
              className="text-[10px] tracking-wider"
              style={{ color: COLORS.primaryText }}
            >
              الدفاع المدني السعودي
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="rounded-lg p-1 flex items-center backdrop-blur-md border border-white/10 bg-black/20">
            {['مباشر', 'آخر ساعة', 'تاريخي'].map(t => (
              <button
                key={t}
                onClick={() => setTimeFilter(t)}
                className="px-3 py-1 rounded text-[10px] font-bold transition-all"
                style={{
                  backgroundColor:
                    timeFilter === t ? COLORS.deepEmerald : 'transparent',
                  color:
                    timeFilter === t ? COLORS.primaryText : COLORS.mutedText
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition text-[10px] font-bold"
          >
            <ArrowLeft size={14} /> الرئيسية
          </button>
        </div>
      </div>

      {/* --- Top KPIs --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        <StatCard
          icon={AlertTriangle}
          label="نداءات نشطة"
          value="42"
          color={COLORS.criticalRed}
          subtext="مناطق فيضان"
        />
        <StatCard
          icon={Users}
          label="في خطر"
          value="156"
          color={COLORS.warningOrange}
          subtext="تم تحديد الموقع"
        />
        <StatCard
          icon={ShieldCheck}
          label="تم الإجلاء"
          value="8,420"
          color={COLORS.successGreen}
          subtext="بنجاح"
        />
        <StatCard
          icon={Truck}
          label="زمن الوصول"
          value="06:30"
          color={COLORS.mintHighlight}
          subtext="متوسط (دقيقة)"
        />
      </div>

      {/* --- Weather Widget --- */}
      <div className="shrink-0 p-3 rounded-xl border border-white/5 bg-black/20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-500/20 rounded-full text-blue-300">
            <Wind size={18} />
          </div>
          <div className="flex gap-6 text-xs font-bold text-white">
            <div className="flex flex-col">
              <span className="text-blue-300 text-[10px]">الرياح</span>
              {weatherLive.wind.toFixed(1)} م/ث
            </div>
            <div className="flex flex-col">
              <span className="text-blue-300 text-[10px]">الاتجاه</span>
              {weatherLive.direction}°
            </div>
            <div className="flex flex-col">
              <span className="text-blue-300 text-[10px]">الأمطار</span>
              {weatherLive.rainfall}
            </div>
            <div className="flex flex-col">
              <span className="text-blue-300 text-[10px]">التصريف</span>
              {weatherLive.drainage}
            </div>
          </div>
        </div>
        <span className="text-[10px] px-2 py-0.5 bg-emerald-500/15 text-emerald-300 rounded border border-emerald-500/20 font-bold hidden sm:block">
          بث مباشر
        </span>
      </div>

      {/* --- Main Grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-2 gap-3 flex-1 min-h-0 overflow-hidden">
        
        {/* Flood Map */}
        <div
          className="lg:col-span-2 lg:row-span-2 p-4 rounded-xl border border-white/10 shadow-xl backdrop-blur-sm flex flex-col h-full overflow-hidden"
          style={{ backgroundColor: `${COLORS.panelBg}f2` }}
        >
          <div className="flex justify-between items-center mb-2 shrink-0">
            <h3
              className="text-sm font-bold flex items-center gap-2"
              style={{ color: COLORS.mintHighlight }}
            >
              <Droplets size={16} className="text-blue-400" /> خريطة التنبؤ بالكارثة
            </h3>
            {/* Time Toggle Buttons - now use dynamic color */}
            <div className="flex gap-1">
              {['10min', '30min', '60min'].map(time => {
                const isActive = selectedTime === time;
                const activeColor = getPolygonColor(time);
                return (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className="px-2 py-0.5 rounded text-[10px] font-medium transition-colors"
                    style={{
                      backgroundColor: isActive ? activeColor : 'rgba(255,255,255,0.1)',
                      color: isActive ? '#000' : '#d1d5db',
                      fontWeight: isActive ? 'bold' : 'normal'
                    }}
                  >
                    {time === '10min' ? '10 د' : time === '30min' ? '30 د' : '60 د'}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 min-h-0 rounded-lg overflow-hidden border border-white/5">
            {floodLoading && !floodData ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <MapContainer
                center={[
                  floodLocation?.lat || 24.712,
                  floodLocation?.lng || 46.681
                ]}
                zoom={13}
                className="h-full w-full bg-[#0d1a14]"
                zoomControl={false}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution="CARTO"
                />
                <MapController
                  center={
                    floodLocation ? [floodLocation.lat, floodLocation.lng] : null
                  }
                />
                {floodLocation && (
                  <Marker
                    position={[floodLocation.lat, floodLocation.lng]}
                    icon={createFloodIcon()}
                  />
                )}
                {/* Scaled-down Polygon with New Colors */}
                {currentPred?.boundary && (
                  <Polygon
                    positions={generateEllipsePoints(
                      currentPred.boundary.center,
                      currentPred.boundary.radius * 0.8, 
                      currentPred.boundary.radius * 0.4, 
                      200
                    )}
                    pathOptions={{
                      stroke: true,
                      color: currentColor,
                      dashArray: '5,5',
                      fillColor: currentColor,
                      fillOpacity: 0.4, 
                      weight: 2
                    }}
                  />
                )}
              </MapContainer>
            )}
          </div>
        </div>

        {/* SOS Chart */}
        <div
          className="p-4 rounded-xl border border-white/10 shadow-xl backdrop-blur-sm flex flex-col h-full overflow-hidden"
          style={{ backgroundColor: `${COLORS.panelBg}f2` }}
        >
          <div className="flex justify-between mb-2 shrink-0">
            <h3
              className="text-xs font-bold flex items-center gap-2"
              style={{ color: COLORS.mintHighlight }}
            >
              <Radio size={14} className="animate-pulse text-red-500" /> تدفق
              النداءات (SOS)
            </h3>
          </div>
          <div className="flex-1 w-full min_h-0" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sosTrendData}>
                <defs>
                  <linearGradient id="colorSos" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={COLORS.criticalRed}
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor={COLORS.criticalRed}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  stroke={COLORS.mutedText}
                  tick={{ fontSize: 10 }}
                  interval={1}
                />
                <YAxis
                  stroke={COLORS.mutedText}
                  tick={{ fontSize: 10 }}
                  width={30}
                />
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={`${COLORS.mintHighlight}10`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: COLORS.panelBg,
                    border: `1px solid ${COLORS.criticalRed}`,
                    fontSize: '10px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="signals"
                  stroke={COLORS.criticalRed}
                  strokeWidth={2}
                  fill="url(#colorSos)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rescue Table */}
        <div
          className="rounded-xl border border-white/10 overflow-hidden shadow-2xl flex flex-col h_full"
          style={{ backgroundColor: `${COLORS.panelBg}f2` }}
        >
          <div className="p-3 border-b border-white/10 flex justify-between items-center shrink-0">
            <h3
              className="text-xs font-bold flex items-center gap-2"
              style={{ color: COLORS.mintHighlight }}
            >
              <Users size={14} className="text-orange-500" /> طلبات الإنقاذ
            </h3>
            <span className="text-[10px] text-gray-400 font-mono">LIVE</span>
          </div>

          <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-right">
              <thead
                className="text-[10px] font-bold uppercase sticky top-0 z-10"
                style={{
                  backgroundColor: COLORS.navigationDark,
                  color: COLORS.subtleText
                }}
              >
                <tr>
                  <th className="px-3 py-2">النوع</th>
                  <th className="px-3 py-2">الموقع</th>
                  <th className="px-3 py-2">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[10px] font-medium">
                {rescueRequests.map(req => (
                  <tr
                    key={req.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-3 py-2 font-bold">{req.type}</td>
                    <td className="px-3 py-2 opacity-70 truncate max-w-[80px]">
                      {req.location}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: req.status.includes('جاري')
                            ? `${COLORS.warningOrange}33`
                            : req.status.includes('تم')
                            ? `${COLORS.successGreen}33`
                            : `${COLORS.criticalRed}33`,
                          color: req.status.includes('جاري')
                            ? COLORS.warningOrange
                            : req.status.includes('تم')
                            ? COLORS.mintHighlight
                            : COLORS.dangerMarker
                        }}
                      >
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
      `}</style>
    </div>
  );
};

export default Analysis;