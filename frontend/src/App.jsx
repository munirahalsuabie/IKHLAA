import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import AlertScreen from './pages/AlertScreen';
import MapScreen from './pages/MapScreen';
import Dashboard from './pages/Dashboard';
import Analysis from './pages/Analysis';

const MobileLayout = ({ children }) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Base iPhone design size
      const baseWidth = 393;
      const baseHeight = 852;

      // Margin so frame doesn't touch edges
      const margin = 40;

      // Compute scale factors
      const scaleX = (vw - margin) / baseWidth;
      const scaleY = (vh - margin) / baseHeight;

      // Final scale 
      const finalScale = Math.min(scaleX, scaleY, 1);
      setScale(finalScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <div className="h-screen w-screen bg-zinc-900 flex items-center justify-center overflow-hidden relative">
      {/* iPhone Frame */}
      <div
        className="relative bg-black rounded-[55px] shadow-[0_0_50px_rgba(0,0,0,0.5)]
                   border-[8px] border-zinc-800 ring-1 ring-zinc-700 box-content"
        style={{
          width: 393,
          height: 852,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Side Buttons (left) */}
        <div className="absolute top-28 -left-3 w-1 h-7 bg-zinc-700 rounded-l-lg" />
        <div className="absolute top-40 -left-3 w-1 h-16 bg-zinc-700 rounded-l-lg" />
        <div className="absolute top-60 -left-3 w-1 h-16 bg-zinc-700 rounded-l-lg" />

        {/* Side Button (right) */}
        <div className="absolute top-44 -right-3 w-1 h-24 bg-zinc-700 rounded-r-lg" />

        {/* Screen Area */}
        <div className="w-full h-full bg-white rounded-[46px] overflow-hidden relative isolate">
          {/* Dynamic Island */}
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2
                       w-[120px] h-[35px] bg-black rounded-full"
          />

          {/* Actual page content */}
          <div className="w-full h-full font-sans">
            {children}
          </div>

          {/* Home Bar */}
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2
                       w-[130px] h-[5px] bg-black/20 rounded-full"
          />
        </div>
      </div>
    </div>
  );
};

/* -----------------------------------------------
   MAIN APP ROUTER
------------------------------------------------ */
function App() {
  return (
    <Router>
      <Routes>
        {/* Desktop dashboard (full screen) */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Desktop analysis page (full screen) */}
        <Route path="/analysis" element={<Analysis />} />

        {/* Mobile: alert screen in iPhone frame */}
        <Route
          path="/"
          element={
            <MobileLayout>
              <AlertScreen />
            </MobileLayout>
          }
        />

        {/* Mobile: map screen in iPhone frame */}
        <Route
          path="/map"
          element={
            <MobileLayout>
              <MapScreen />
            </MobileLayout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
