// Emergency lock-screen style alert screen.
// Shows iOS-like time, notification center, and a CTA to start evacuation.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronLeft } from 'lucide-react';

const AlertScreen = () => {
  const navigate = useNavigate();

  // Current date/time formatting 
  const date = new Date();

  // Arabic date 
  const dateOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    calendar: 'gregory'
  };
  const dateString = date.toLocaleDateString('ar-SA', dateOptions);

  // Lock-screen like time 
  const timeString = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return (
    <div
      className="h-full w-full relative overflow-hidden flex flex-col items-center pt-20 px-4 font-sans"
      style={{
        background: `
          radial-gradient(circle at 20% 30%, #7dd3fc 0%, transparent 40%),
          radial-gradient(circle at 80% 70%, #86efac 0%, transparent 45%),
          linear-gradient(180deg, #0f172a 0%, #020617 100%)
        `,
        color: 'white'
      }}
      dir="rtl"
    >
      {/* --- Lock-screen header: time + date --- */}
      <div className="text-center mb-12" dir="ltr">
        <h1 className="text-7xl font-bold tracking-tight text-white/90 drop-shadow-md">
          {timeString}
        </h1>
        <p className="text-xl font-medium mt-1 text-white/90 drop-shadow-md" dir="rtl">
          {dateString}
        </p>
      </div>

      {/* --- Notification center header --- */}
      <div
        className="w-full max-w-sm mb-4 flex justify-between items-center opacity-0 animate-fade-in-up"
        style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
      >
        <h2 className="text-2xl font-bold tracking-tight drop-shadow-md">
          مركز الإشعارات
        </h2>

        {/* Close icon */}
        <button className="p-1 rounded-full bg-white/20 backdrop-blur-sm">
          <span className="sr-only">إغلاق</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* --- Emergency alert notification card --- */}
      <div
        className="w-full max-w-sm animate-fade-in-up"
        style={{ animationDelay: '0.4s', animationFillMode: 'forwards', opacity: 0 }}
      >
        <div className="flex justify-between items-center mb-2 px-1">
          <h3 className="text-lg font-semibold drop-shadow-md flex items-center gap-2">
            تنبيهات الطوارئ
          </h3>
          <span className="text-xs bg-black/20 px-2 py-1 rounded-full backdrop-blur-md">
            عرض أقل
          </span>
        </div>

        {/* Main emergency alert card */}
        <div className="bg-[#2C2C2E]/90 backdrop-blur-xl rounded-[22px] p-4 text-right shadow-lg mb-4 border border-white/10">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <div className="bg-red-500 rounded-md p-1">
                <AlertTriangle size={16} fill="white" className="text-white" />
              </div>
              <span className="font-bold text-sm">تنبيه طوارئ</span>
            </div>
            <span className="text-xs text-gray-400">الآن</span>
          </div>

          <div className="flex gap-4">
            <div className="shrink-0 pt-1">
              <AlertTriangle
                size={36}
                className="text-yellow-500 fill-yellow-500/20"
              />
            </div>
            <div>
              <p className="text-[15px] font-semibold leading-snug mb-1">
                تحذير الدفاع المدني
              </p>
              <p className="text-[15px] leading-snug text-gray-200">
                أمر إخلاء عاجل صادر لمنطقتك. تم رصد خطر في محيطك، يرجى اتخاذ
                الحيطة والحذر وإخلاء المنطقة.
              </p>
            </div>
          </div>

          {/* CTA button → navigate to /map */}
          <button
            onClick={() => navigate('/map')}
            className="mt-4 w-full py-3 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 active:bg-gray-200 transition-colors"
          >
            بدء الإخلاء <ChevronLeft size={16} />
          </button>
        </div>

        {/* Secondary stacked card for depth effect  */}
        <div className="bg-[#2C2C2E]/80 backdrop-blur-xl rounded-[22px] p-4 text-right shadow-lg scale-95 opacity-60 -mt-24 border border-white/5 -z-10 relative mx-4">
          <div className="h-12" />
        </div>
      </div>

      {/* --- Bottom lock-screen controls --- */}
      <div className="absolute bottom-10 left-0 right-0 px-10 flex justify-between pointer-events-none">
        <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
          {/* Flashlight icon  */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="white"
            className="opacity-80"
          >
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
          {/* Camera icon */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            className="opacity-80"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
      </div>

      {/* --- Local animation styles  --- */}
      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation-name: fade-in-up;
          animation-duration: 0.6s;
          animation-fill-mode: forwards;
        }
      `}</style>
    </div>
  );
};

export default AlertScreen;
