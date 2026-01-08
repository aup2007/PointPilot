import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from amadeus import Client, ResponseError
from typing import Optional, Literal
from datetime import datetime
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware # Add this import

# 1. SETUP & CONFIGURATION
load_dotenv() 

AMADEUS_ID = os.getenv("AMADEUS_ID", "YOUR_AMADEUS_API_KEY")
AMADEUS_SECRET = os.getenv("AMADEUS_SECRET", "YOUR_AMADEUS_SECRET")
amadeus = Client(client_id=AMADEUS_ID, client_secret=AMADEUS_SECRET)

app= FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows all origins
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods
    allow_headers=["*"], # Allows all headers
)

# --- DATABASE LAYER (All Static / No Dynamic Guessing) ---

# A. FLIGHT AWARD CHART
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
    # NEW: The "Bilt Sweet Spot" - Hawaii for 10k points via Turkish
    "LAX-HNL": [
        {"partner": "Turkish Airlines", "cost": 10000, "tax": 5.60},
        {"partner": "United Airlines", "cost": 22500, "tax": 5.60},
        {"partner": "Alaska Airlines", "cost": 15000, "tax": 5.60},
    ],
    # NEW: Europe via Flying Blue
    "JFK-CDG": [
        {"partner": "Air France (Flying Blue)", "cost": 20000, "tax": 80},
        {"partner": "Delta SkyMiles", "cost": 35000, "tax": 5.60},
        {"partner": "American Airlines", "cost": 30000, "tax": 5.60},
    ],
    # NEW: Miami to South America
    "MIA-EZE": [
        {"partner": "American Airlines", "cost": 20000, "tax": 5.60},
        {"partner": "LATAM (via British Airways)", "cost": 25000, "tax": 30},
    ]
}

# B. UNIFIED HOTEL AWARD CHART
# We normalize all programs (Hyatt, Marriott, IHG) into a "Tier-Based" System.
# This proves you can take messy external data and structure it cleanly.

HOTEL_CATALOG = {
    "NYC": {"name": "Park Hyatt New York", "tier": 8, "base_cash": 1200},
    "LAX": {"name": "Waldorf Astoria Beverly Hills", "tier": 7, "base_cash": 850},
    "SFO": {"name": "Hyatt Regency Embarcadero", "tier": 4, "base_cash": 450},
    "HNL": {"name": "Andaz Maui", "tier": 8, "base_cash": 1100},
    "NRT": {"name": "Park Hyatt Tokyo", "tier": 7, "base_cash": 950}
}

HOTEL_CHARTS = {
    "hyatt": {
        1: {"standard": 5000, "peak": 6500},
        4: {"standard": 15000, "peak": 18000}, 
        7: {"standard": 30000, "peak": 35000}, 
        8: {"standard": 40000, "peak": 45000}, 
    },
    "marriott": {
        # Simulating Marriott's old Category system for stability
        1: {"standard": 20000, "peak": 25000},
        4: {"standard": 35000, "peak": 45000},
        7: {"standard": 60000, "peak": 70000},
        8: {"standard": 85000, "peak": 100000},
    },
    "ihg": {
        # IHG uses higher point values generally
        1: {"standard": 30000, "peak": 40000},
        4: {"standard": 50000, "peak": 65000},
        7: {"standard": 80000, "peak": 100000},
        8: {"standard": 120000, "peak": 150000},
    }
}


def predict_season(date_str: str) -> str:
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        return "peak" if dt.month in [6, 7, 8, 12] else "standard"
    except:
        return "standard"

class FlightRequest(BaseModel):
    origin: str
    destination: str
    date: str
    is_rent_day: bool = False

class HotelRequest(BaseModel):
    city_code: str
    date: str
    is_rent_day: bool = False
    # hotel_tier: Optional[int] = 4
# --- INPUT MODELS ---

# class FlightRequest(BaseModel):
#     origin: str          
#     destination: str     
#     date: str            
#     is_rent_day: bool = False

# class HotelRequest(BaseModel):
#     city_code: str       
#     program: Literal["hyatt", "marriott", "ihg"] 
#     hotel_tier: int = 4  # 1 (Budget) to 8 (Luxury)
#     date: str
#     nights: int = 1
#     is_rent_day: bool = False

# --- HELPER FUNCTIONS ---

# def predict_season(date_str: str) -> str:
#     """
#     Determines if date is 'peak' or 'standard' based on month.
#     """
#     try:
#         dt = datetime.strptime(date_str, "%Y-%m-%d")
#         # Summer (Jun-Aug) & Holidays (Dec) = Peak
#         if dt.month in [6, 7, 8, 12]:
#             return "peak"
#         return "standard"
#     except ValueError:
#         return "standard"

def calculate_cpp(cash: float, points: int) -> float:
    if points == 0: return 0.0
    return (cash * 100) / points

def get_recommendation(cpp: float, program: str):
    """
    Returns action/color based on Program-Specific Thresholds.
    (Marriott points are worth less than Hyatt points, so the bar is lower).
    """
    # Define "Good Value" thresholds per program
    thresholds = {
        "hyatt": 1.6,    # Hyatt points are valuable
        "marriott": 0.8, # Marriott points are inflated
        "ihg": 0.6,      # IHG points are worth very little
        "flight": 1.25   # Baseline for airlines
    }
    
    baseline = thresholds.get(program, 1.0)
    
    if cpp > (baseline * 1.5):
        return "TRANSFER NOW", "green", f"Excellent Value ({cpp:.2f}¢) - Beats baseline."
    elif cpp >= baseline:
        return "DECENT VALUE", "yellow", f"Standard Redemption ({cpp:.2f}¢) - Fair use."
    else:
        return "PAY CASH", "red", f"Poor Value ({cpp:.2f}¢) - Save your points."

# --- API ENDPOINTS ---

@app.get("/")
def home():
    return {"status": "PointPilot Engine Online"}

# 1. FLIGHT OPTIMIZER
@app.post("/optimize/flight")
def optimize_flight(request: FlightRequest):
    try:
        # Live Amadeus Cash Price
        search = amadeus.shopping.flight_offers_search.get(
            originLocationCode=request.origin.upper(),
            destinationLocationCode=request.destination.upper(),
            departureDate=request.date,
            adults=1, max=1
        )
        cash_price = float(search.data[0]['price']['total']) if search.data else 850.0
    except:
        cash_price = 850.0

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
    # Lookup specific property from Catalog
    prop = HOTEL_CATALOG.get(request.city_code.upper(), {"name": "Premium Stay", "tier": 4, "base_cash": 450})
    season = predict_season(request.date)
    
    results = []
    # Loop through ALL partners for a multi-partner matrix
    for prog in ["hyatt", "marriott", "ihg"]:
        if prog not in HOTEL_CHARTS: continue
        
        chart = HOTEL_CHARTS[prog]
        tier_data = chart.get(prop['tier'], chart[4])
        
        base_pts = tier_data.get(season, tier_data["standard"])
        effective_pts = base_pts / 2 if request.is_rent_day else base_pts
        
        cpp = (prop['base_cash'] * 100) / effective_pts
        
        results.append({
            "partner": f"{prog.upper()} ({prop['name'] if prog == 'hyatt' else prog.upper() + ' Elite'})", 
            "points_required": int(effective_pts), 
            "cpp": round(cpp, 2), 
            "cash_savings": round(((prop['base_cash'] * 100 / 1.25) - effective_pts) * 1.25 / 100, 2),
            "status": "EXCELLENT" if cpp > 2.0 else "GOOD"
        })
    
    results = sorted(results, key=lambda x: x['cpp'], reverse=True)
    return {
        "best_option": results[0], 
        "results": results, 
        "market_baseline": {"property": prop['name'], "cash_price": prop['base_cash']}
    }