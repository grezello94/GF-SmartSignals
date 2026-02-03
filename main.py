# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests
from bs4 import BeautifulSoup
from textblob import TextBlob

app = FastAPI()

# Allow your Frontend to talk to your Backend
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def get_market_sentiment():
    url = "https://www.moneycontrol.com/news/business/markets/"
    headers = {'User-Agent': 'Mozilla/5.0'}
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.text, 'html.parser')
    headlines = [h.text for h in soup.find_all('h2')[:5]] # Get top 5 headlines
    
    analysis = [TextBlob(h).sentiment.polarity for h in headlines]
    avg_sentiment = sum(analysis) / len(analysis) if analysis else 0
    return avg_sentiment

@app.get("/api/signal")
async def get_signal():
    sentiment = get_market_sentiment()
    # Sureness Logic: News Sentiment + Simulated Market Strength
    # Formula: $S = (Sentiment \times 50 + 50) \times 0.6 + (TechnicalStrength \times 0.4)$
    sureness = (sentiment * 50 + 50) * 0.6 + (85 * 0.4) 
    
    return {
        "name": "GF SmartSignals",
        "sureness": round(sureness, 1),
        "call": "BUY" if sureness > 75 else "HOLD",
        "reason": "Strong bullish news sentiment detected." if sentiment > 0.1 else "Market neutral."
    }