from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
from typing import Optional, Tuple, List, Dict
import xml.etree.ElementTree as ET
import requests
from bs4 import BeautifulSoup
from textblob import TextBlob
import yfinance as yf
import pandas as pd

app = FastAPI()

# Allow your Frontend to talk to your Backend
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

REQUEST_TIMEOUT_SECONDS = 8

NEWS_SOURCES = [
    {
        "name": "Moneycontrol Markets",
        "url": "https://www.moneycontrol.com/rss/marketreports.xml",
    },
    {
        "name": "Economic Times Markets",
        "url": "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
    },
]

STRICT_POLICY = True
SENTIMENT_THRESHOLD = 0.20
MIN_SURENESS = 80.0
MIN_CONFIRMATIONS = 2

last_price: Optional[float] = None
last_signal = {
    "name": "GF SmartSignals",
    "policy": "strict",
    "sureness": 0.0,
    "call": "SCANNING...",
    "action": "WAIT",
    "reason": "Engine warming up",
    "price": None,
    "sentiment": 0.0,
    "bias": "NEUTRAL",
    "target": None,
    "stop_loss": None,
    "earning_potential": 0.0,
    "volatility": None,
    "degraded": True,
    "timestamp": None,
    "news": [],
    "indicators": {},
    "signals": [],
}

@app.get("/")
async def root():
    return {"status": "GF SmartSignals Engine is LIVE", "version": "1.3"}


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def fetch_rss_headlines(url: str, source: str, limit: int = 6) -> List[Dict[str, str]]:
    try:
        response = requests.get(url, timeout=REQUEST_TIMEOUT_SECONDS)
        if response.status_code != 200:
            return []
    except requests.RequestException:
        return []

    try:
        root = ET.fromstring(response.text)
    except ET.ParseError:
        return []

    headlines = []
    for item in root.findall(".//item"):
        title = item.findtext("title")
        if title:
            headlines.append({"source": source, "title": title.strip()})
        if len(headlines) >= limit:
            break

    if headlines:
        return headlines

    # Atom fallback
    for entry in root.findall(".//{http://www.w3.org/2005/Atom}entry"):
        title = entry.findtext("{http://www.w3.org/2005/Atom}title")
        if title:
            headlines.append({"source": source, "title": title.strip()})
        if len(headlines) >= limit:
            break

    return headlines


def get_market_sentiment() -> Tuple[float, bool, List[Dict[str, str]]]:
    all_headlines: List[Dict[str, str]] = []
    for source in NEWS_SOURCES:
        headlines = fetch_rss_headlines(source["url"], source["name"], limit=5)
        all_headlines.extend(headlines)

    if not all_headlines:
        return 0.0, False, []

    analysis = [TextBlob(item["title"]).sentiment.polarity for item in all_headlines]
    avg_sentiment = sum(analysis) / len(analysis)
    return avg_sentiment, True, all_headlines


def get_index_data(symbol: str) -> Tuple[Optional[float], Optional[pd.DataFrame], bool]:
    try:
        ticker = yf.Ticker(symbol)
        data = ticker.history(period="10d", interval="15m")
        if data.empty:
            return None, None, False
        return float(data["Close"].iloc[-1]), data, True
    except Exception:
        return None, None, False


def compute_rsi(close: pd.Series, period: int = 14) -> Optional[float]:
    if close is None or len(close) < period + 1:
        return None
    delta = close.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = (-delta).where(delta < 0, 0.0)
    avg_gain = gain.rolling(window=period).mean()
    avg_loss = loss.rolling(window=period).mean()
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    value = rsi.iloc[-1]
    if pd.isna(value):
        return None
    return float(value)


def compute_atr(data: Optional[pd.DataFrame], period: int = 14) -> Optional[float]:
    if data is None or len(data) < period + 1:
        return None
    try:
        high = data["High"]
        low = data["Low"]
        close = data["Close"]
    except Exception:
        return None

    prev_close = close.shift(1)
    tr1 = (high - low).abs()
    tr2 = (high - prev_close).abs()
    tr3 = (low - prev_close).abs()

    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.rolling(window=period).mean().iloc[-1]
    if pd.isna(atr):
        return None
    return float(atr)


def compute_indicators(data: Optional[pd.DataFrame]) -> Dict[str, Optional[float]]:
    if data is None or data.empty:
        return {
            "sma20": None,
            "sma50": None,
            "rsi": None,
            "atr": None,
            "volatility": None,
            "trend": "UNKNOWN",
            "momentum": "UNKNOWN",
        }

    close = data["Close"]
    sma20 = close.rolling(window=20).mean().iloc[-1]
    sma50 = close.rolling(window=50).mean().iloc[-1]
    rsi = compute_rsi(close)
    atr = compute_atr(data)

    latest_close = float(close.iloc[-1])

    trend = "NEUTRAL"
    if sma20 is not None and sma50 is not None:
        if latest_close > sma50 and sma20 > sma50:
            trend = "BULLISH"
        elif latest_close < sma50 and sma20 < sma50:
            trend = "BEARISH"

    momentum = "NEUTRAL"
    if rsi is not None:
        if rsi >= 60:
            momentum = "BULLISH"
        elif rsi <= 40:
            momentum = "BEARISH"

    volatility = None
    if atr is not None and latest_close > 0:
        volatility = (atr / latest_close) * 100

    return {
        "sma20": float(sma20) if not pd.isna(sma20) else None,
        "sma50": float(sma50) if not pd.isna(sma50) else None,
        "rsi": float(rsi) if rsi is not None else None,
        "atr": float(atr) if atr is not None else None,
        "volatility": float(volatility) if volatility is not None else None,
        "trend": trend,
        "momentum": momentum,
    }


def derive_bias_from_sentiment(sentiment: float) -> str:
    if sentiment >= SENTIMENT_THRESHOLD:
        return "BULLISH"
    if sentiment <= -SENTIMENT_THRESHOLD:
        return "BEARISH"
    return "NEUTRAL"


def compute_sureness(sentiment: float, confirmations: int) -> float:
    sentiment_score = min(abs(sentiment), 1.0) * 40
    alignment_score = (confirmations / 2) * 40
    base = 20
    return clamp(base + sentiment_score + alignment_score, 0, 100)


def round_to_step(price: float, step: int) -> int:
    return int(round(price / step) * step)


def compute_targets(
    price: Optional[float],
    atr: Optional[float],
    direction: str,
    reward_risk: float = 2.0,
    stop_loss_atr: float = 1.0,
) -> Tuple[Optional[float], Optional[float], float, Optional[float]]:
    if price is None:
        return None, None, 0.0, None

    if atr is None or atr <= 0:
        if direction == "short":
            target = price * 0.9875
            stop_loss = price * 1.0075
        else:
            target = price * 1.0125
            stop_loss = price * 0.9925
        earning_potential = (abs(target - price) / price) * 100
        return target, stop_loss, earning_potential, None

    if direction == "short":
        stop_loss = price + (atr * stop_loss_atr)
        target = price - (atr * stop_loss_atr * reward_risk)
    else:
        stop_loss = price - (atr * stop_loss_atr)
        target = price + (atr * stop_loss_atr * reward_risk)
    earning_potential = (abs(target - price) / price) * 100
    volatility = (atr / price) * 100
    return target, stop_loss, earning_potential, volatility


def build_signal_for_index(
    symbol: str,
    label: str,
    strike_step: int,
    sentiment: float,
    sentiment_bias: str,
    headlines_ok: bool,
) -> Dict[str, object]:
    price, data, price_ok = get_index_data(symbol)
    indicators = compute_indicators(data)

    trend = indicators.get("trend", "UNKNOWN")
    momentum = indicators.get("momentum", "UNKNOWN")

    confirmations = 0
    if sentiment_bias != "NEUTRAL":
        confirmations = sum(1 for bias in [trend, momentum] if bias == sentiment_bias)

    sureness = compute_sureness(sentiment, confirmations)

    action = "NO TRADE"
    reason = "Strict policy: insufficient alignment"
    direction = "long"

    if sentiment_bias == "NEUTRAL":
        reason = "Strict policy: sentiment neutral"
    elif confirmations < MIN_CONFIRMATIONS:
        reason = "Strict policy: trend/momentum not aligned"
    elif sureness < MIN_SURENESS:
        reason = "Strict policy: confidence below threshold"
    else:
        if sentiment_bias == "BEARISH":
            action = "STRONG SELL" if sureness >= 90 else "SELL"
            direction = "short"
        else:
            action = "STRONG BUY" if sureness >= 90 else "BUY"
            direction = "long"
        reason = "Strict policy: multi-signal alignment confirmed"

    atr = indicators.get("atr")
    target = None
    stop_loss = None
    earning_potential = 0.0
    volatility = indicators.get("volatility")

    if action not in ["NO TRADE", "WAIT"]:
        target, stop_loss, earning_potential, volatility_atr = compute_targets(price, atr, direction)
        if volatility_atr is not None:
            volatility = volatility_atr

    call = f"{label} NO TRADE"
    option_type = None
    strike = None

    if price is not None and action not in ["NO TRADE", "WAIT"]:
        strike = round_to_step(price, strike_step)
        option_type = "PE" if direction == "short" else "CE"
        call = f"{label} {strike} {option_type}"

    degraded = not price_ok or not headlines_ok or indicators.get("rsi") is None

    return {
        "underlying": label,
        "symbol": symbol,
        "price": round(price, 2) if price is not None else None,
        "sureness": round(sureness, 1),
        "bias": sentiment_bias,
        "trend": trend,
        "momentum": momentum,
        "action": action,
        "reason": reason,
        "call": call,
        "option_type": option_type,
        "strike": strike,
        "target": round(target, 2) if target is not None else None,
        "stop_loss": round(stop_loss, 2) if stop_loss is not None else None,
        "earning_potential": round(earning_potential, 2),
        "volatility": round(volatility, 2) if volatility is not None else None,
        "indicators": {
            "sma20": round(indicators.get("sma20"), 2) if indicators.get("sma20") is not None else None,
            "sma50": round(indicators.get("sma50"), 2) if indicators.get("sma50") is not None else None,
            "rsi": round(indicators.get("rsi"), 2) if indicators.get("rsi") is not None else None,
            "atr": round(indicators.get("atr"), 2) if indicators.get("atr") is not None else None,
            "trend": trend,
            "momentum": momentum,
        },
        "degraded": degraded,
    }


@app.get("/api/signal")
async def get_signal():
    global last_price, last_signal

    sentiment, headlines_ok, headlines = get_market_sentiment()
    sentiment_bias = derive_bias_from_sentiment(sentiment)

    nifty_signal = build_signal_for_index("^NSEI", "NIFTY", 50, sentiment, sentiment_bias, headlines_ok)
    bank_signal = build_signal_for_index("^NSEBANK", "BANKNIFTY", 100, sentiment, sentiment_bias, headlines_ok)

    signals = [nifty_signal, bank_signal]
    actionable = [s for s in signals if s["action"] in ["BUY", "STRONG BUY", "SELL", "STRONG SELL"]]

    if actionable:
        primary = max(actionable, key=lambda s: s["sureness"])
    else:
        primary = max(signals, key=lambda s: s["sureness"])

    payload = {
        "name": "GF SmartSignals",
        "policy": "strict",
        "sureness": primary["sureness"],
        "call": primary["call"],
        "action": primary["action"],
        "reason": primary["reason"],
        "price": primary["price"],
        "sentiment": round(sentiment, 3),
        "bias": primary["bias"],
        "target": primary["target"],
        "stop_loss": primary["stop_loss"],
        "earning_potential": primary["earning_potential"],
        "volatility": primary["volatility"],
        "degraded": primary["degraded"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "news": headlines,
        "indicators": primary["indicators"],
        "signals": signals,
    }

    last_signal = payload
    return payload
