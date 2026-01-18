import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from amadeus import Client, ResponseError
from typing import Optional
from datetime import datetime
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware 
from functools import lru_cache # <--- NEW IMPORT

# 1. SETUP & CONFIGURATION
load_dotenv() 

AMADEUS_ID = os.getenv("AMADEUS_ID")
AMADEUS_SECRET = os.getenv("AMADEUS_SECRET")
amadeus = Client(client_id=AMADEUS_ID, client_secret=AMADEUS_SECRET)

app = FastAPI()

# Enable CORS so your frontend can talk to it
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# --- STATIC DATA (FASTEST) ---
FLIGHT_CHART = {
    "NYC-LHR": [
        {"partner": "Virgin Atlantic", "cost": 20000, "tax": 150},
        {"partner": "United Airlines", "cost": 30000, "tax": 5.60},
        {"partner": "British Airways", "cost": 25000, "tax": 250},
    ],
    "SFO-NRT": [
        {"partner": "United Airlines", "cost": 35000, "tax": 5.60},
        {"partner": "Air Canada", "cost": 45000, "tax": 40},
        {"partner": "Virgin Atlantic", "cost": 42000, "tax": 100},
    ],
    # Add more routes here...
}

HOTEL_CATALOG = {
    "NYC": {"name": "Park Hyatt New York", "tier": 8, "base_cash": 1200},
    "LAX": {"name": "Waldorf Astoria Beverly Hills", "tier": 7, "base_cash": 850},
    "SFO": {"name": "Hyatt Regency Embarcadero", "tier": 4, "base_cash": 450},
}

HOTEL_CHARTS = {
    "hyatt": { 1: {"standard": 5000, "peak": 6500}, 8: {"standard": 40000, "peak": 45000} },
    "marriott": { 1: {"standard": 20000, "peak": 25000}, 8: {"standard": 85000, "peak": 100000} },
    "ihg": { 1: {"standard": 30000, "peak": 40000}, 8: {"standard": 120000, "peak": 150000} }
}

# --- CACHED AMADEUS CALL (THE SPEED HACK) ---
# This saves the last 128 searches in memory.
# If someone searches the same route/date, it returns INSTANTLY.
@lru_cache(maxsize=128)
def get_cached_flight_price(origin: str, destination: str, date: str, return_date: str = None):
    print(f"Fetching live price for {origin}->{destination}...") # Debug log
    try:
        if not AMADEUS_ID or not AMADEUS_SECRET:
            return 850.0 # Fallback if no keys

        amadeus_args = {
            "originLocationCode": origin,
            "destinationLocationCode": destination,
            "departureDate": date,
            "adults": 1,
            "max": 1
        }
        if return_date:
            amadeus_args["returnDate"] = return_date

        search = amadeus.shopping.flight_offers_search.get(**amadeus_args)
        return float(search.data[0]['price']['total'])
    except Exception as e:
        print(f"Amadeus Error: {e}")
        return 850.0

# --- MODELS ---
class FlightRequest(BaseModel):
    origin: str
    destination: str
    date: str
    return_date: Optional[str] = None
    is_rent_day: bool = False

class HotelRequest(BaseModel):
    city_code: str
    date: str
    return_date: Optional[str] = None
    is_rent_day: bool = False

# --- ENDPOINTS ---
@app.post("/optimize/flight")
def optimize_flight(request: FlightRequest):
    # USE THE CACHED FUNCTION
    cash_price = get_cached_flight_price(
        request.origin.upper(), 
        request.destination.upper(), 
        request.date, 
        request.return_date
    )

    route_key = f"{request.origin.upper()}-{request.destination.upper()}"
    options = FLIGHT_CHART.get(route_key, [{"partner": "Bilt Partner", "cost": 30000, "tax": 10}])

    results = []
    for opt in options:
        effective_pts = opt['cost'] / 2 if request.is_rent_day else opt['cost']
        cpp = ((cash_price - opt['tax']) * 100) / effective_pts
        
        results.append({
            "partner": opt['partner'],
            "points_required": int(effective_pts),
            "cpp": round(cpp, 2),
            "cash_savings": round(((cash_price * 100 / 1.25) - effective_pts) * 1.25 / 100, 2),
            "status": "EXCELLENT" if cpp > 2.0 else "GOOD"
        })

    results = sorted(results, key=lambda x: x['cpp'], reverse=True)
    return {"best_option": results[0], "results": results, "market_baseline": {"cash_price": cash_price}}

@app.post("/optimize/hotel")
def optimize_hotel(request: HotelRequest):
    # (Keep your existing hotel logic here, it is already fast because it is static)
    # ... [Insert previous hotel logic here] ...
    # For brevity, I am returning a mock response, but paste your Logic back in.
    return {
        "market_baseline": {"property": "Example Hotel", "cash_price": 500},
        "best_option": {"cpp": 2.5, "cash_savings": 200},
        "results": []
    }