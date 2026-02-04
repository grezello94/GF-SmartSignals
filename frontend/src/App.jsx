import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE
  || (typeof window !== 'undefined' ? `http://${window.location.hostname}:8000` : 'http://127.0.0.1:8000');

const emptySignal = {
  name: 'GF SmartSignals',
  policy: 'strict',
  sureness: 0,
  call: 'SCANNING...',
  action: 'WAIT',
  reason: 'Engine warming up',
  price: null,
  sentiment: 0,
  bias: 'NEUTRAL',
  target: null,
  stop_loss: null,
  earning_potential: 0,
  degraded: true,
  timestamp: null,
  volatility: null,
  news: [],
  indicators: {},
  signals: [],
};

function App() {
  const [signal, setSignal] = useState(emptySignal);
  const [online, setOnline] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const fetchSignal = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      try {
        const response = await fetch(`${API_BASE}/api/signal`, { signal: controller.signal });
        if (!response.ok) {
          throw new Error('Bad response');
        }
        const data = await response.json();
        const normalized = {
          ...emptySignal,
          ...data,
          sureness: Number(data.sureness) || 0,
          news: Array.isArray(data.news) ? data.news : [],
          signals: Array.isArray(data.signals) ? data.signals : [],
          indicators: data.indicators && typeof data.indicators === 'object' ? data.indicators : {},
        };
        setSignal(normalized);
        setOnline(true);
        setLastUpdated(new Date());
      } catch (error) {
        setOnline(false);
      } finally {
        clearTimeout(timeout);
      }
    };

    fetchSignal();
    const interval = setInterval(fetchSignal, 5000);
    return () => clearInterval(interval);
  }, []);

  const surenessClamped = Math.max(0, Math.min(100, Number(signal.sureness) || 0));
  const sentimentValue = Number(signal.sentiment) || 0;
  const volatilityValue = Number(signal.volatility);
  const biasLabel = signal.bias || (sentimentValue > 0.15 ? 'BULLISH' : sentimentValue < -0.15 ? 'BEARISH' : 'NEUTRAL');
  const isBearish = biasLabel === 'BEARISH';
  const indicators = signal.indicators || {};
  const headlines = Array.isArray(signal.news) ? signal.news : [];
  const displaySignals = signal.signals && signal.signals.length ? signal.signals : [signal];

  const sentimentLabel = sentimentValue > 0.15 ? 'BULLISH' : sentimentValue < -0.15 ? 'BEARISH' : 'NEUTRAL';
  const sentimentClass = sentimentLabel === 'BULLISH'
    ? 'text-emerald-600'
    : sentimentLabel === 'BEARISH'
      ? 'text-red-600'
      : 'text-amber-500';

  const actionClass = signal.action === 'STRONG BUY' || signal.action === 'STRONG SELL'
    ? 'text-emerald-600'
    : signal.action === 'BUY' || signal.action === 'SELL'
      ? 'text-cyan-600'
      : signal.action === 'HOLD'
        ? 'text-amber-500'
        : 'text-slate-500';

  const targetClass = isBearish ? 'text-red-600' : 'text-emerald-600';
  const stopLossClass = isBearish ? 'text-emerald-600' : 'text-red-600';

  const formatNumber = (value, digits = 2) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return '--';
    }
    return Number(value).toFixed(digits);
  };

  const formatTime = (value) => {
    if (!value) return '--';
    try {
      return new Date(value).toLocaleTimeString();
    } catch {
      return '--';
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900 font-display relative overflow-hidden">
      <div className="scanlines"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_55%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(20,184,166,0.16),_transparent_60%)]"></div>

      <div className="relative z-10 mx-auto w-full max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] tracking-[0.5em] text-cyan-600 uppercase">GF SmartSignals</p>
            <h1 className="mt-2 text-2xl md:text-3xl font-bold">Decision Console</h1>
            <p className="mt-1 text-xs text-slate-500">Noise-filtered F&O signal stream</p>
          </div>
          <div className={`self-start rounded-full border px-4 py-2 text-[11px] tracking-[0.4em] ${online ? 'border-emerald-500/40 text-emerald-600' : 'border-red-500/40 text-red-600'}`}>
            {online ? 'LIVE' : 'OFFLINE'}
          </div>
        </div>
        {!online && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-700">
            Backend unreachable. Make sure the FastAPI server is running and reachable at
            <span className="font-semibold text-red-700"> {API_BASE}</span>.
          </div>
        )}
        {online && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-xs text-emerald-700">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </span>
            Live data connected. Signals are streaming from the backend.
          </div>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <p className="text-[11px] tracking-[0.4em] text-slate-500 uppercase">Sureness Meter</p>
            <div className="mt-5">
              <div className="text-5xl font-bold">{surenessClamped.toFixed(1)}%</div>
              <div className="mt-4 h-3 rounded-full bg-slate-200/70 overflow-hidden">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 shadow-[0_10px_30px_rgba(56,189,248,0.45)] transition-all duration-700"
                  style={{ width: `${surenessClamped}%` }}
                ></div>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Action: <span className={`font-semibold ${actionClass}`}>{signal.action}</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3">
                <p className="text-[10px] text-slate-500 uppercase">Signal</p>
                <p className="mt-1 font-semibold text-cyan-600">{signal.call}</p>
              </div>
              <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3">
                <p className="text-[10px] text-slate-500 uppercase">Price</p>
                <p className="mt-1 font-semibold text-slate-900">{formatNumber(signal.price, 2)}</p>
              </div>
              <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3">
                <p className="text-[10px] text-slate-500 uppercase">Target</p>
                <p className={`mt-1 font-semibold ${targetClass}`}>{formatNumber(signal.target, 2)}</p>
              </div>
              <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3">
                <p className="text-[10px] text-slate-500 uppercase">Stop Loss</p>
                <p className={`mt-1 font-semibold ${stopLossClass}`}>{formatNumber(signal.stop_loss, 2)}</p>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.4em]">Universe Signals</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {displaySignals.map((item) => (
                  <div key={item.underlying} className="rounded-xl border border-slate-200/70 bg-white/70 p-3">
                    <p className="text-[10px] text-slate-500 uppercase">{item.underlying || 'INDEX'}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{item.call}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Action: <span className={actionClass}>{item.action}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <p className="text-[11px] tracking-[0.4em] text-slate-500 uppercase">Market Intel</p>
            <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3">
                <p className="text-[10px] text-slate-500 uppercase">Bias</p>
                <p className={`mt-1 font-semibold ${sentimentClass}`}>{biasLabel}</p>
              </div>
              <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3">
                <p className="text-[10px] text-slate-500 uppercase">Sentiment Val</p>
                <p className="mt-1 font-semibold text-slate-900">{formatNumber(sentimentValue, 3)}</p>
              </div>
              <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3">
                <p className="text-[10px] text-slate-500 uppercase">Earning Pot.</p>
                <p className="mt-1 font-semibold text-cyan-600">{formatNumber(signal.earning_potential, 2)}%</p>
              </div>
              <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3">
                <p className="text-[10px] text-slate-500 uppercase">Volatility</p>
                <p className="mt-1 font-semibold text-slate-900">{formatNumber(volatilityValue, 2)}%</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200/70 bg-white/70 p-4">
              <p className="text-[10px] text-slate-500 uppercase">System Reason</p>
              <p className="mt-2 text-sm text-slate-700">{signal.reason}</p>
              <p className="mt-2 text-[10px] text-slate-500 uppercase">Policy</p>
              <p className="mt-1 text-xs text-slate-700">{signal.policy || 'strict'}</p>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200/70 bg-white/70 p-4">
              <p className="text-[10px] text-slate-500 uppercase">Indicators Used</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-[11px] text-slate-600">
                <div>Trend: <span className="text-slate-900">{indicators.trend || '--'}</span></div>
                <div>Momentum: <span className="text-slate-900">{indicators.momentum || '--'}</span></div>
                <div>SMA20: <span className="text-slate-900">{formatNumber(indicators.sma20, 2)}</span></div>
                <div>SMA50: <span className="text-slate-900">{formatNumber(indicators.sma50, 2)}</span></div>
                <div>RSI: <span className="text-slate-900">{formatNumber(indicators.rsi, 2)}</span></div>
                <div>ATR: <span className="text-slate-900">{formatNumber(indicators.atr, 2)}</span></div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200/70 bg-white/70 p-4">
              <p className="text-[10px] text-slate-500 uppercase">Headlines Used</p>
              <div className="mt-3 max-h-48 space-y-2 overflow-auto text-[11px] text-slate-600">
                {headlines.length ? (
                  headlines.map((item, index) => (
                    <div key={`${item.source}-${index}`} className="rounded-lg border border-slate-200/70 bg-white/80 p-2">
                      <span className="text-cyan-600">{item.source}</span>: {item.title}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500">No headlines available.</div>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
              <span>Last update: {lastUpdated ? lastUpdated.toLocaleTimeString() : '--'}</span>
              <span>Feed time: {formatTime(signal.timestamp)}</span>
              <span className={`rounded-full border px-2 py-1 text-[10px] ${signal.degraded ? 'border-amber-500/40 text-amber-600' : 'border-emerald-500/40 text-emerald-600'}`}>
                {signal.degraded ? 'DEGRADED' : 'HEALTHY'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 text-[10px] tracking-[0.3em] text-slate-500 uppercase">
          Engine status: {online ? 'Streaming live signals' : 'Awaiting backend connection'}
        </div>
      </div>
    </div>
  );
}

export default App;
