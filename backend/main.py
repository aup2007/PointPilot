import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from amadeus import Client, ResponseError
from typing import Optional
from datetime import datetime
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware 
from functools import lru_cache 

# 1. SETUP & CONFIGURATION
load_dotenv() 

AMADEUS_ID = os.getenv("AMADEUS_ID")
AMADEUS_SECRET = os.getenv("AMADEUS_SECRET")
amadeus = Client(client_id=AMADEUS_ID, client_secret=AMADEUS_SECRET)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# --- EXPANDED DATASET ---

# 1. AIRPORTS (Frontend will use this list)
SUPPORTED_LOCATIONS = [
    {"code": "JFK", "name": "New York (JFK)"},
    {"code": "LHR", "name": "London Heathrow"},
    {"code": "CDG", "name": "Paris Charles de Gaulle"},
    {"code": "HND", "name": "Tokyo Haneda"},
    {"code": "NRT", "name": "Tokyo Narita"},
    {"code": "DXB", "name": "Dubai International"},
    {"code": "SIN", "name": "Singapore Changi"},
    {"code": "LAX", "name": "Los Angeles"},
    {"code": "SFO", "name": "San Francisco"},
    {"code": "MIA", "name": "Miami International"},
    {"code": "EZE", "name": "Buenos Aires"},
    {"code": "SYD", "name": "Sydney Kingsford Smith"},
]

# 2. FLIGHT ROUTES (Static Points Data)
FLIGHT_CHART = {
    "JFK-LHR": [{"partner": "Virgin Atlantic", "cost": 20000, "tax": 150}, {"partner": "BA Avios", "cost": 25000, "tax": 200}],
    "JFK-CDG": [{"partner": "Air France", "cost": 15000, "tax": 80}, {"partner": "Delta", "cost": 30000, "tax": 5.60}],
    "JFK-DXB": [{"partner": "Emirates", "cost": 72500, "tax": 100}, {"partner": "Air Canada (Partner)", "cost": 55000, "tax": 50}],
    "LAX-HND": [{"partner": "JAL (via BA)", "cost": 25750, "tax": 45}, {"partner": "American Airlines", "cost": 35000, "tax": 5.60}],
    "SFO-SIN": [{"partner": "Singapore Airlines", "cost": 40000, "tax": 25}, {"partner": "United", "cost": 55000, "tax": 5.60}],
    "MIA-EZE": [{"partner": "American Airlines", "cost": 20000, "tax": 5.60}, {"partner": "LATAM", "cost": 25000, "tax": 30}],
    "SYD-LAX": [{"partner": "Qantas", "cost": 45000, "tax": 120}, {"partner": "American Airlines", "cost": 40000, "tax": 5.60}],
}

# 3. HOTEL CATALOG
HOTEL_CATALOG = {
    "NYC": {"name": "Park Hyatt New York", "tier": 8, "base_cash": 1200},
    "PAR": {"name": "Park Hyatt Paris-Vendôme", "tier": 8, "base_cash": 1600},
    "TYO": {"name": "Andaz Tokyo Toranomon Hills", "tier": 7, "base_cash": 950},
    "LON": {"name": "The London EDITION", "tier": 7, "base_cash": 800},
    "DXB": {"name": "Al Maha Desert Resort", "tier": 8, "base_cash": 1800},
    "SIN": {"name": "Marina Bay Sands (Partner)", "tier": 6, "base_cash": 600},
    "LAX": {"name": "Waldorf Astoria Beverly Hills", "tier": 8, "base_cash": 900},
}

HOTEL_CHARTS = {
    "hyatt": { 1: {"standard": 5000, "peak": 6500}, 6: {"standard": 25000, "peak": 29000}, 7: {"standard": 30000, "peak": 35000}, 8: {"standard": 40000, "peak": 45000} },
    "marriott": { 1: {"standard": 20000, "peak": 25000}, 6: {"standard": 50000, "peak": 60000}, 7: {"standard": 60000, "peak": 70000}, 8: {"standard": 85000, "peak": 100000} },
    "ihg": { 1: {"standard": 30000, "peak": 40000}, 6: {"standard": 70000, "peak": 85000}, 7: {"standard": 80000, "peak": 100000}, 8: {"standard": 120000, "peak": 150000} }
}

# --- HELPERS ---
def predict_season(date_str: str) -> str:
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return "peak" if dt.month in [6, 7, 8, 12] else "standard"
    except:
        return "standard"

@lru_cache(maxsize=128)
def get_cached_flight_price(origin: str, destination: str, date: str):
    # Only fetch live price if we have keys, otherwise mock realistic prices
    if not AMADEUS_ID or not AMADEUS_SECRET:
        # Mock Logic based on route distance
        if origin == "JFK" and destination == "DXB": return 1200.0
        if origin == "JFK" and destination == "LHR": return 850.0
        return 900.0

    try:
        search = amadeus.shopping.flight_offers_search.get(
            originLocationCode=origin,
            destinationLocationCode=destination,
            departureDate=date,
            adults=1,
            max=1
        )
        return float(search.data[0]['price']['total'])
    except:
        return 900.0

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
@app.get("/")
def home():
    return {"status": "PointPilot Engine Online", "routes": len(FLIGHT_CHART)}

@app.post("/optimize/flight")
def optimize_flight(request: FlightRequest):
    cash_price = get_cached_flight_price(request.origin.upper(), request.destination.upper(), request.date)
    
    route_key = f"{request.origin.upper()}-{request.destination.upper()}"
    
    # Use fallback if route not found
    options = FLIGHT_CHART.get(route_key, [
        {"partner": "United (Star Alliance)", "cost": 35000, "tax": 50},
        {"partner": "British Airways (Oneworld)", "cost": 30000, "tax": 150},
        {"partner": "Flying Blue (SkyTeam)", "cost": 25000, "tax": 80}
    ])

    results = []
    for opt in options:
        effective_pts = opt['cost'] / 2 if request.is_rent_day else opt['cost']
        
        # 1. Calculate Net Value (Cash - Taxes you still have to pay)
        net_value = cash_price - opt['tax']
        
        # 2. Calculate CPP (Cents Per Point)
        if effective_pts > 0:
            cpp = (net_value * 100) / effective_pts
        else:
            cpp = 0.0
            
        # 3. STRICT STATUS LOGIC (The Fix)
        if cpp >= 2.0:
            status = "EXCELLENT"
        elif cpp >= 1.1:
            status = "GOOD"
        else:
            status = "POOR"  # Captures 0.17, -0.16, etc.

        results.append({
            "partner": opt['partner'],
            "points_required": int(effective_pts),
            "cpp": round(cpp, 2),
            "cash_savings": round(net_value, 2),
            "status": status
        })

    # Sort so the "POOR" options drop to the bottom
    results = sorted(results, key=lambda x: x['cpp'], reverse=True)
    
    # Ensure best_option is valid (if all are poor, pick the least poor)
    best = results[0] if results else None
    
    return {"best_option": best, "results": results, "market_baseline": {"cash_price": cash_price}}
@app.post("/optimize/hotel")
def optimize_hotel(request: HotelRequest):
    # Map Airport Code (e.g., JFK) to City Code (NYC) if needed
    city_map = {"JFK": "NYC", "LHR": "LON", "CDG": "PAR", "HND": "TYO", "NRT": "TYO", "DXB": "DXB", "SIN": "SIN", "LAX": "LAX"}
    city = city_map.get(request.city_code.upper(), request.city_code.upper())
    
    prop = HOTEL_CATALOG.get(city, {"name": "Luxury Collection Hotel", "tier": 5, "base_cash": 500})
    season = predict_season(request.date)
    
    # Calculate Nights
    nights = 1
    if request.return_date:
        try:
            d1 = datetime.strptime(request.date, "%Y-%m-%d")
            d2 = datetime.strptime(request.return_date, "%Y-%m-%d")
            nights = max(1, (d2 - d1).days)
        except:
            nights = 1
            
    total_cash = prop['base_cash'] * nights

    results = []
    for prog in ["hyatt", "marriott", "ihg"]:
        if prog not in HOTEL_CHARTS: continue
        chart = HOTEL_CHARTS[prog]
        tier_data = chart.get(prop['tier'], chart[6]) # Default to tier 6 if missing
        base_pts = tier_data.get(season, tier_data["standard"])
        
        total_pts = base_pts * nights
        effective_pts = total_pts / 2 if request.is_rent_day else total_pts
        
        cpp = (total_cash * 100) / effective_pts
        
        results.append({
            "partner": f"{prog.upper()}", 
            "points_required": int(effective_pts), 
            "cpp": round(cpp, 2), 
            "cash_savings": round(((total_cash * 100 / 1.25) - effective_pts) * 1.25 / 100, 2),
            "status": "EXCELLENT" if cpp > 2.0 else "GOOD"
        })
    
    results = sorted(results, key=lambda x: x['cpp'], reverse=True)
    return {
        "best_option": results[0], 
        "results": results, 
        "market_baseline": {"property": prop['name'], "cash_price": total_cash}
    }