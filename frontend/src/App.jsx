import React, { useState, useEffect } from 'react';

function App() {
  const [signal, setSignal] = useState({ sureness: "0%", call: "SCANNING...", action: "WAIT" });

  // This connects your Frontend to the "Brain" (main.py) we built
  useEffect(() => {
    const fetchSignal = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/signal');
        const data = await response.json();
        setSignal(data);
      } catch (error) {
        console.error("Backend not running!");
      }
    };
    fetchSignal();
    const interval = setInterval(fetchSignal, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#06080a] text-white flex flex-col items-center justify-center p-6 font-sans overflow-hidden">
      {/* Background Animated Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]"></div>

      <div className="relative z-10 w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[40px] p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <h1 className="text-center text-[10px] tracking-[0.5em] text-blue-400 font-black mb-10 uppercase">
          GF SmartSignals AI
        </h1>

        {/* Dynamic Sureness Ring */}
        <div className="relative flex items-center justify-center mb-12">
          <svg className="w-56 h-56 transform -rotate-90">
            <circle cx="112" cy="112" r="95" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
            <circle cx="112" cy="112" r="95" stroke="currentColor" strokeWidth="10" fill="transparent" 
              strokeDasharray={597} strokeDashoffset={597 - (597 * parseInt(signal.sureness)) / 100}
              className="text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.6)] transition-all duration-1000 stroke-round" />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-6xl font-black tracking-tighter">{signal.sureness}</span>
            <span className="text-[9px] text-white/30 tracking-[0.3em] uppercase mt-2">Sureness Alpha</span>
          </div>
        </div>

        {/* Live Data Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
            <p className="text-[10px] text-white/40 uppercase mb-1">Signal</p>
            <p className="font-bold text-blue-400">{signal.call}</p>
          </div>
          <div className="bg-white/5 p-5 rounded-3xl border border-white/5">
            <p className="text-[10px] text-white/40 uppercase mb-1">Action</p>
            <p className="font-bold text-emerald-400">{signal.action}</p>
          </div>
        </div>

        <button className="w-full mt-10 bg-gradient-to-r from-blue-600 to-indigo-700 py-5 rounded-3xl font-bold text-sm tracking-widest shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all">
          ACTIVATE REAL-TIME MODE
        </button>
      </div>

      <p className="mt-8 text-white/20 text-[9px] tracking-[0.2em] uppercase">
        System Status: {signal.reason}
      </p>
    </div>
  );
}

export default App;