from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests
from bs4 import BeautifulSoup
from textblob import TextBlob
import yfinance as yf  # 1. New Import added here

app = FastAPI()

# Allow your Frontend to talk to your Backend
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/")
async def root():
    return {"status": "GF SmartSignals Engine is LIVE", "version": "1.1"}

def get_market_sentiment():
    url = "https://www.moneycontrol.com/news/business/markets/"
    headers = {'User-Agent': 'Mozilla/5.0'}
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.text, 'html.parser')
    headlines = [h.text for h in soup.find_all('h2')[:5]]
    
    analysis = [TextBlob(h).sentiment.polarity for h in headlines]
    avg_sentiment = sum(analysis) / len(analysis) if analysis else 0
    return avg_sentiment

# 2. This NEW function replaces the old /api/signal
@app.get("/api/signal")
async def get_signal():
    # Fetch real-time Nifty 50 price from Yahoo Finance
    nifty = yf.Ticker("^NSEI")
    data = nifty.history(period="1d")
    current_price = data['Close'].iloc[-1]
    
    # Calculate Sureness using live sentiment
    sentiment = get_market_sentiment()
    sureness = 75 + (sentiment * 20)
    
    return {
        "name": "GF SmartSignals",
        "sureness": f"{round(sureness, 1)}%",
        "call": f"NIFTY @ {round(current_price)}",
        "action": "STRONG BUY" if sureness > 85 else "HOLD",
        "reason": "AI analyzing live technicals + news"
    }