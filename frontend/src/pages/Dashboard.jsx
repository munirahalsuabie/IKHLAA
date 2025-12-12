import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import {
  ShieldAlert,
  Activity,
  Users,
  Radio,
  Bell,
  Search,
  Siren,
  AlertTriangle,
  Flame,
  Clock,
  Navigation,
  Megaphone,
  ShieldCheck,
  X
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- IKHLAA COLOR PALETTE ---
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
  evacuatingYellow: '#ffd54f'
};

// --- STATIC ZONE DATA (matches backend zones) ---
const ZONES = [
  // Danger zones (Red)
  {
    id: 'z_danger_1',
    name: 'فندق جي دبليو ماريوت',
    status: 'DANGEROUS',
    severity: 'عالي جدًا',
    lat: 24.794925,
    lng: 46.631998,
    type: 'danger'
  },
  {
    id: 'z_danger_2',
    name: 'الرياض بارك',
    status: 'DANGEROUS',
    severity: 'عالي',
    lat: 24.756676,
    lng: 46.629279,
    type: 'danger'
  },
  {
    id: 'z_danger_3',
    name: 'صحارى مول',
    status: 'DANGEROUS',
    severity: 'عالي',
    lat: 24.741623252390212,
    lng: 46.68242920722131,
    type: 'danger'
  },

  // Crowded zones (Yellow)
  {
    id: 'z_crowd_1',
    name: 'حديقة الملك سلمان',
    status: 'CROWDED',
    severity: 'متوسط',
    lat: 24.729325746876825,
    lng: 46.70088757967561,
    type: 'crowded'
  },
  {
    id: 'z_crowd_2',
    name: 'السوليتير',
    status: 'CROWDED',
    severity: 'متوسط',
    lat: 24.802676,
    lng: 46.650391,
    type: 'crowded'
  },
  {
    id: 'z_crowd_3',
    name: 'ممشى الغدير',
    status: 'CROWDED',
    severity: 'متوسط',
    lat: 24.779551,
    lng: 46.642615,
    type: 'crowded'
  },

  // Safe zones (Green)
  {
    id: 'z_safe_1',
    name: 'المدرسة المتوسطة 177',
    status: 'SAFE',
    severity: 'آمن',
    lat: 24.790393,
    lng: 46.645407,
    type: 'safe'
  },
  {
    id: 'z_safe_2',
    name: 'ثانوية الأمير عبدالمجيد',
    status: 'SAFE',
    severity: 'آمن',
    lat: 24.750984,
    lng: 46.65005,
    type: 'safe'
  },
  {
    id: 'z_safe_3',
    name: 'مستشفى الحبيب',
    status: 'SAFE',
    severity: 'آمن',
    lat: 24.813232,
    lng: 46.6249,
    type: 'safe'
  }
];

// --- OPERATION LOGS (right sidebar) ---
const LOGS = [
  { id: 1, msg: 'تم نشر وحدة إخلاء في شمال الرياض', time: 'منذ دقيقتين', type: 'info' },
  { id: 2, msg: 'إنذار حريق: صحارى مول', time: 'منذ 5 دقائق', type: 'critical' },
  { id: 3, msg: 'ازدحام مروري: البوليفارد', time: 'منذ 12 دقيقة', type: 'warning' },
  { id: 4, msg: 'وصول الدعم الجوي للموقع', time: 'منذ 20 دقيقة', type: 'success' }
];

// --- HELPER: Arabic label for zone status ---
const getArabicStatus = (status) => {
  switch (status) {
    case 'DANGEROUS':
      return 'منطقة خطر';
    case 'CROWDED':
      return 'مزدحمة';
    case 'SAFE':
      return 'منطقة آمنة';
    default:
      return status;
  }
};

// --- HELPER: Radar-style marker icon for map ---
const createRadarIcon = (color) =>
  L.divIcon({
    className: 'custom-radar',
    html: `
      <div class="relative flex items-center justify-center" style="width: 20px; height: 20px;">
        <span class="animate-ping absolute inline-flex h-5 w-5 rounded-full opacity-75" style="background-color: ${color}"></span>
        <span class="relative inline-flex rounded-full h-3 w-3 border-2 border-white shadow-lg" style="background-color: ${color}"></span>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

// --- KPI STAT CARD ---
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
      <h3 className="text-xl font-black font-mono" style={{ color: COLORS.primaryText }}>
        {value}
      </h3>
      {subtext && (
        <p className="text-[10px] mt-1 opacity-70" style={{ color: COLORS.subtleText }}>
          {subtext}
        </p>
      )}
    </div>
    <div className="p-2 rounded-full" style={{ backgroundColor: `${color}20` }}>
      <Icon size={20} style={{ color }} />
    </div>
  </div>
);

// --- ACTION BUTTON USED IN POPUPS ---
const ActionButton = ({ icon: Icon, label, onClick, color = 'success' }) => {
  const bgColor = color === 'danger' ? COLORS.criticalRed : COLORS.successGreen;
  const hoverColor = color === 'danger' ? COLORS.deepAlertRed : COLORS.deepEmerald;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold rounded transition-all"
      style={{
        background: `linear-gradient(135deg, ${bgColor} 0%, ${hoverColor} 100%)`,
        color: COLORS.primaryText
      }}
    >
      <Icon size={14} /> {label}
    </button>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedZone, setSelectedZone] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({ total_reports: 1240 });

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch stats from backend /dashboard
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/dashboard');
        if (res.ok) {
          const data = await res.json();
          if (typeof data.total_reports === 'number') {
            setStats(data);
          }
        }
      } catch (e) {
        console.error('Failed to fetch /dashboard:', e);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const totalReports = stats?.total_reports ?? 0;

  return (
    <div
      className="h-screen w-full text-white font-sans overflow-hidden flex flex-col"
      style={{
        background: `linear-gradient(135deg, ${COLORS.deepForest} 0%, ${COLORS.primaryGreen} 50%, ${COLORS.forestShadow} 100%)`
      }}
      dir="rtl"
    >
      {/* Tooltip CSS overrides (Leaflet) */}
      <style>{`
        .leaflet-tooltip.zone-tooltip {
          background-color: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
        .leaflet-tooltip-top:before,
        .leaflet-tooltip-bottom:before,
        .leaflet-tooltip-left:before,
        .leaflet-tooltip-right:before {
          display: none !important;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.25);
          border-radius: 4px;
        }
      `}</style>

      {/* --- HEADER BAR --- */}
      <header
        className="h-14 border-b flex items-center justify-between px-6 z-50 shadow-md shrink-0"
        style={{
          backgroundColor: COLORS.navigationDark,
          borderColor: `${COLORS.mintHighlight}26`
        }}
      >
        {/* Left: logo + title */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${COLORS.successGreen} 0%, ${COLORS.deepEmerald} 100%)`
            }}
          >
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

        {/* Right: clock + emergency state */}
        <div className="flex items-center gap-4">
          <div className="text-left hidden md:block">
            <p
              className="text-lg font-mono font-bold leading-none"
              style={{ color: COLORS.mintHighlight }}
            >
              {currentTime.toLocaleTimeString('en-US', { hour12: false })}
            </p>
            <p
              className="text-[10px] font-mono"
              style={{ color: COLORS.primaryText }}
            >
              {currentTime.toLocaleDateString('ar-SA')}
            </p>
          </div>
          <div
            style={{
              height: '24px',
              width: '1px',
              backgroundColor: COLORS.elementBg
            }}
          ></div>
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-md font-bold text-xs shadow-lg animate-pulse"
            style={{
              background: `linear-gradient(135deg, ${COLORS.criticalRed} 0%, ${COLORS.deepAlertRed} 100%)`,
              color: COLORS.primaryText
            }}
          >
            <Radio size={14} />
            حالة طوارئ
          </button>
          <div className="relative cursor-pointer">
            <Bell size={18} style={{ color: COLORS.primaryText }} />
            <span
              className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
              style={{ backgroundColor: COLORS.dangerMarker }}
            ></span>
          </div>
        </div>
      </header>

      {/* --- KPI BAR --- */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 pb-0 shrink-0">
        <StatCard
          icon={AlertTriangle}
          label="إجمالي البلاغات"
          value={totalReports.toLocaleString('en-US')}
          color={COLORS.criticalRed}
          subtext="+12% آخر ساعة"
        />
        <StatCard
          icon={Flame}
          label="المناطق الخطرة"
          value={ZONES.filter((z) => z.type === 'danger').length.toString()}
          color={COLORS.dangerMarker}
          subtext="تتطلب تدخل فوري"
        />
        <StatCard
          icon={Users}
          label="مناطق مزدحمة"
          value={ZONES.filter((z) => z.type === 'crowded').length.toString()}
          color={COLORS.warningOrange}
          subtext="تحت المراقبة"
        />
        <StatCard
          icon={ShieldCheck}
          label="مناطق آمنة"
          value={ZONES.filter((z) => z.type === 'safe').length.toString()}
          color={COLORS.successGreen}
          subtext="جاهزة للاستقبال"
        />
        <StatCard
          icon={Navigation}
          label="الطرق المغلقة"
          value="18"
          color={COLORS.mintHighlight}
          subtext="قيد المعالجة الآن"
        />
      </div>

      {/* --- MAIN LAYOUT: sidebar + map --- */}
      <div className="flex-1 min-h-0 flex overflow-hidden p-4 gap-4">
        {/* RIGHT SIDEBAR: operations log + navigation */}
        <aside
          className="w-80 backdrop-blur rounded-xl flex flex-col overflow-hidden shadow-2xl shrink-0"
          style={{
            background: `${COLORS.panelBg}f2`,
            border: `1px solid ${COLORS.mintHighlight}26`
          }}
        >
          {/* Navigation to analysis screen */}
          <div
            className="p-4 border-b shrink-0"
            style={{ borderColor: `${COLORS.mintHighlight}26` }}
          >
            <button
              onClick={() => navigate('/analysis')}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg transition-all shadow-md hover:shadow-lg font-bold text-xs"
              style={{
                background: `linear-gradient(135deg, ${COLORS.deepEmerald} 0%, ${COLORS.successGreen} 100%)`,
                color: COLORS.primaryText,
                border: `1px solid ${COLORS.mintHighlight}40`
              }}
            >
              <Activity size={16} />
              التنبؤ والتحليلات
            </button>
          </div>

          {/* Operations log header */}
          <div
            className="p-3 border-b flex justify-between items-center shrink-0"
            style={{
              backgroundColor: `${COLORS.elementBg}cc`,
              borderColor: `${COLORS.mintHighlight}26`
            }}
          >
            <h3
              className="font-bold text-sm flex items-center gap-2"
              style={{ color: COLORS.primaryText }}
            >
              <Activity size={14} style={{ color: COLORS.mintHighlight }} />
              سجل العمليات
            </h3>
            <button
              className="text-xs hover:underline font-bold"
              style={{ color: COLORS.primaryText }}
            >
              عرض الكل
            </button>
          </div>

          {/* Operations log list (scrollable) */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {LOGS.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded transition cursor-pointer hover:opacity-80"
                style={{
                  backgroundColor: `${COLORS.elementBg}b3`,
                  borderRight: `2px solid ${COLORS.mintHighlight}40`
                }}
              >
                <div className="flex justify-between items-start mb-1">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor:
                        log.type === 'critical'
                          ? `${COLORS.criticalRed}33`
                          : log.type === 'warning'
                          ? `${COLORS.warningOrange}33`
                          : `${COLORS.successGreen}33`,
                      color:
                        log.type === 'critical'
                          ? COLORS.dangerMarker
                          : log.type === 'warning'
                          ? COLORS.warningOrange
                          : COLORS.successGreen
                    }}
                  >
                    {log.type === 'critical'
                      ? 'طوارئ'
                      : log.type === 'warning'
                      ? 'تنبيه'
                      : 'معلومة'}
                  </span>
                  <span
                    className="text-[10px] flex items-center gap-1"
                    style={{ color: COLORS.mutedText }}
                  >
                    <Clock size={10} /> {log.time}
                  </span>
                </div>
                <p
                  className="text-xs font-medium leading-relaxed"
                  style={{ color: COLORS.primaryText }}
                >
                  {log.msg}
                </p>
              </div>
            ))}
          </div>
        </aside>

        {/* MAIN MAP AREA */}
        <main
          className="flex-1 relative rounded-xl overflow-hidden shadow-2xl"
          style={{ border: `1px solid ${COLORS.mintHighlight}26` }}
        >
          {/* Leaflet map */}
          <MapContainer
            center={[24.7136, 46.6753]}
            zoom={11}
            className="h-full w-full"
            style={{ backgroundColor: COLORS.deepShadow }}
            zoomControl={false}
          >
            <TileLayer
              attribution="&copy; CARTO"
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            {ZONES.map((zone) => {
              const colorCode =
                zone.type === 'danger'
                  ? COLORS.dangerMarker
                  : zone.type === 'crowded'
                  ? COLORS.warningOrange
                  : COLORS.successGreen;

              return (
                <Marker
                  key={zone.id}
                  position={[zone.lat, zone.lng]}
                  icon={createRadarIcon(colorCode)}
                  eventHandlers={{ click: () => setSelectedZone(zone) }}
                >
                  {/* Custom tooltip on hover */}
                  <Tooltip
                    sticky={true}
                    direction="top"
                    offset={[0, -10]}
                    opacity={1}
                    className="zone-tooltip"
                  >
                    <div
                      className="px-3 py-2 rounded-lg shadow-xl"
                      style={{
                        background: `linear-gradient(135deg, ${COLORS.deepForest} 0%, ${COLORS.primaryGreen} 100%)`,
                        border: `2px solid ${colorCode}`,
                        minWidth: '140px'
                      }}
                    >
                      <p
                        className="font-bold text-xs mb-1 text-center"
                        style={{ color: COLORS.primaryText }}
                      >
                        {zone.name}
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        {zone.type === 'danger' ? (
                          <AlertTriangle
                            size={12}
                            style={{ color: COLORS.dangerMarker }}
                          />
                        ) : zone.type === 'crowded' ? (
                          <Users
                            size={12}
                            style={{ color: COLORS.warningOrange }}
                          />
                        ) : (
                          <ShieldCheck
                            size={12}
                            style={{ color: COLORS.successGreen }}
                          />
                        )}
                        <span
                          className="text-[10px] font-bold"
                          style={{ color: colorCode }}
                        >
                          {getArabicStatus(zone.status)}
                        </span>
                      </div>
                    </div>
                  </Tooltip>

                  {/* Popup for quick action */}
                  <Popup className="custom-popup">
                    <div
                      className="w-48 p-1"
                      style={{ direction: 'rtl', textAlign: 'right' }}
                    >
                      <h4
                        className="font-bold pb-1 mb-2 border-b"
                        style={{
                          color: COLORS.mintHighlight,
                          textAlign: 'right'
                        }}
                      >
                        {zone.name}
                      </h4>
                      <div className="space-y-1">
                        <ActionButton
                          icon={Users}
                          label="أرسل قوة دعم"
                          onClick={() => {}}
                          color="success"
                        />
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Floating map controls (search) */}
          <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2">
            <button
              className="p-2 rounded shadow border"
              style={{
                backgroundColor: COLORS.panelBg,
                borderColor: `${COLORS.mintHighlight}40`,
                color: COLORS.primaryText
              }}
              title="البحث"
            >
              <Search size={18} />
            </button>
          </div>

          {/* Broadcast button at bottom center */}
          <div className="absolute bottom-6 right-1/2 translate-x-1/2 z-[400]">
            <button
              className="flex items-center gap-2 px-6 py-2.5 rounded-full font-bold shadow-lg transition-all active:scale-95 border-2 text-xs"
              style={{
                background: `linear-gradient(135deg, ${COLORS.successGreen} 0%, ${COLORS.deepEmerald} 100%)`,
                color: COLORS.primaryText,
                borderColor: `${COLORS.mintHighlight}4d`,
                boxShadow: `0 0 20px ${COLORS.successGreen}80`
              }}
            >
              <Megaphone size={16} className="animate-pulse" />
              بث تنبيه عام للمنطقة
            </button>
          </div>

          {/* Floating detail panel for selected zone */}
          {selectedZone && (
            <div
              className="
                absolute
                left-4
                top-4
                bottom-4
                w-80
                z-[1000]
                flex
                flex-col
                rounded-xl
                shadow-2xl
                backdrop-blur-md
                overflow-hidden
                transition-all
                duration-300
                animate-in fade-in slide-in-from-left-4
              "
              style={{
                background: `${COLORS.panelBg}f9`,
                border: `1px solid ${
                  selectedZone.type === 'danger'
                    ? COLORS.criticalRed
                    : selectedZone.type === 'crowded'
                    ? COLORS.warningOrange
                    : COLORS.successGreen
                }`
              }}
            >
              {/* Detail panel header */}
              <div
                className="p-3 border-b relative shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.deepForest} 0%, ${COLORS.primaryGreen} 100%)`,
                  borderColor: `${COLORS.mintHighlight}26`
                }}
              >
                <button
                  onClick={() => setSelectedZone(null)}
                  className="absolute top-3 left-3 hover:text-red-400 transition-colors"
                  style={{ color: COLORS.primaryText }}
                >
                  <X size={18} />
                </button>

                <div className="flex items-center gap-3 pr-2">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg"
                    style={{
                      backgroundColor:
                        selectedZone.type === 'danger'
                          ? `${COLORS.criticalRed}33`
                          : selectedZone.type === 'crowded'
                          ? `${COLORS.warningOrange}33`
                          : `${COLORS.successGreen}33`,
                      border: `2px solid ${
                        selectedZone.type === 'danger'
                          ? COLORS.criticalRed
                          : selectedZone.type === 'crowded'
                          ? COLORS.warningOrange
                          : COLORS.successGreen
                      }`
                    }}
                  >
                    {selectedZone.type === 'danger' ? (
                      <AlertTriangle
                        size={20}
                        style={{ color: COLORS.criticalRed }}
                      />
                    ) : selectedZone.type === 'crowded' ? (
                      <Users
                        size={20}
                        style={{ color: COLORS.warningOrange }}
                      />
                    ) : (
                      <ShieldCheck
                        size={20}
                        style={{ color: COLORS.successGreen }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <h2
                      className="text-base font-black truncate leading-tight"
                      style={{ color: COLORS.primaryText }}
                    >
                      {selectedZone.name}
                    </h2>
                    <p
                      className="text-xs opacity-90 mt-1"
                      style={{ color: COLORS.mutedText }}
                    >
                      {getArabicStatus(selectedZone.status)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Detail panel body (scrollable if content is tall) */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {/* Risk analysis section */}
                <div className="flex gap-2">
                  <div className="flex-1 p-2 rounded-lg text-center border border-white/5 bg-white/5">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <AlertTriangle
                        size={14}
                        style={{ color: COLORS.dangerMarker }}
                      />
                      <span className="text-[10px] text-gray-300">
                        مستوى الخطر
                      </span>
                    </div>
                    <p
                      className="font-bold text-sm"
                      style={{
                        color:
                          selectedZone.type === 'danger'
                            ? COLORS.dangerMarker
                            : COLORS.successGreen
                      }}
                    >
                      {selectedZone.severity}
                    </p>
                  </div>
                  <div className="flex-1 p-2 rounded-lg text-center border border-white/5 bg-white/5">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Users
                        size={14}
                        style={{ color: COLORS.warningOrange }}
                      />
                      <span className="text-[10px] text-gray-300">
                        الكثافة
                      </span>
                    </div>
                    <p className="font-bold text-sm text-white">85%</p>
                  </div>
                </div>

                {/* Nearby safe areas */}
                <div>
                  <h4
                    className="font-bold text-xs mb-2 flex items-center gap-1"
                    style={{ color: COLORS.subtleText }}
                  >
                    <ShieldCheck size={14} /> المناطق الآمنة القريبة
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-3 py-2 rounded bg-white/5 border-r-2 border-green-500 hover:bg-white/10 transition">
                      <span className="text-xs text-white"> ثانوية الأمير عبدالمجيد</span>
                      <span className="text-xs font-mono text-green-400">
                        3.2 كم
                      </span>
                    </div>
                    <div className="flex justify-between items-center px-3 py-2 rounded bg-white/5 border-r-2 border-green-500 hover:bg-white/10 transition">
                      <span className="text-xs text-white">المدرسة المتوسطة 177</span>
                      <span className="text-xs font-mono text-green-400">
                        5.1 كم
                      </span>
                    </div>
                  </div>
                </div>

                {/* Assigned units */}
                <div>
                  <h4
                    className="font-bold text-xs mb-2 flex items-center gap-1"
                    style={{ color: COLORS.subtleText }}
                  >
                    <Navigation size={14} /> الوحدات المكلفة
                  </h4>
                  <div className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/10 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded flex items-center justify-center bg-green-900/50">
                        <Siren size={14} className="text-green-400" />
                      </div>
                      <span className="text-xs font-bold text-white">
                        فرقة التدخل السريع (أ)
                      </span>
                    </div>
                    <span className="text-[10px] bg-green-900/80 text-green-300 px-1.5 py-0.5 rounded">
                      في الموقع
                    </span>
                  </div>
                  <button className="w-full py-1.5 border border-dashed border-white/20 text-[10px] rounded hover:bg-white/5 text-gray-300 transition">
                    + تكليف وحدة جديدة
                  </button>
                </div>
              </div>

              {/* Detail panel footer */}
              <div className="p-3 border-t border-white/10 mt-auto bg-black/20 shrink-0">
                <button
                  className="w-full font-bold py-2.5 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 text-xs"
                  style={{
                    background: `linear-gradient(135deg, ${COLORS.criticalRed} 0%, ${COLORS.deepAlertRed} 100%)`,
                    color: COLORS.primaryText
                  }}
                >
                  <AlertTriangle size={16} />
                  بدء بروتوكول الإخلاء
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
