import json
import requests
import os
from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()

def get_current_weather(location, unit="fahrenheit"):
    """
    Get the current weather in a given location using Open-Meteo API.
    """
    try:
        # Get latitude and longitude for the location
        lat, lon = get_lat_lon(location)
        
        if lat is None or lon is None:
            return json.dumps({"location": location, "temperature": "unknown", "error": "Location not found"})
        
        # Make the API request to Open-Meteo
        response = requests.get(
            f"https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,weather_code",
                "timezone": "auto"
            },
            timeout=10
        )
        
        # Check if request was successful
        response.raise_for_status()
        
        # Parse the JSON response
        weather_data = response.json()
        
        # Get temperature in the requested unit
        temp_c = weather_data["current"]["temperature_2m"]
        temperature = temp_c if unit.lower() == "celsius" else (temp_c * 9/5) + 32
        
        # Map weather code to condition description
        condition = get_weather_condition(weather_data["current"]["weather_code"])
        
        # Extract the needed information
        result = {
            "location": location,
            "temperature": str(round(temperature)),
            "unit": unit,
            "condition": condition
        }
        
        return json.dumps(result)
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching weather data: {e}")
        return json.dumps({"location": location, "temperature": "unknown", "error": "Could not fetch weather data"})

def get_lat_lon(city_name):
    """
    Get latitude and longitude for a given city name using OpenStreetMap Nominatim API.
    """
    geo_url = f"https://nominatim.openstreetmap.org/search?q={city_name}&format=json&limit=1"
    response = requests.get(geo_url, headers={"User-Agent": "weather-app"})
    
    if response.status_code == 200 and response.json():
        location = response.json()[0]
        return float(location["lat"]), float(location["lon"])
    else:
        return None, None

def get_weather_condition(code):
    """
    Map WMO Weather interpretation codes to human-readable descriptions.
    Codes from: https://open-meteo.com/en/docs
    """
    conditions = {
        0: "clear sky",
        1: "mainly clear",
        2: "partly cloudy",
        3: "overcast",
        45: "fog",
        48: "depositing rime fog",
        51: "light drizzle",
        53: "moderate drizzle",
        55: "dense drizzle",
        56: "light freezing drizzle",
        57: "dense freezing drizzle",
        61: "slight rain",
        63: "moderate rain",
        65: "heavy rain",
        66: "light freezing rain",
        67: "heavy freezing rain",
        71: "slight snow fall",
        73: "moderate snow fall",
        75: "heavy snow fall",
        77: "snow grains",
        80: "slight rain showers",
        81: "moderate rain showers",
        82: "violent rain showers",
        85: "slight snow showers",
        86: "heavy snow showers",
        95: "thunderstorm",
        96: "thunderstorm with slight hail",
        99: "thunderstorm with heavy hail"
    }
    return conditions.get(code, "unknown")

tool_interface = {
    "type": "function",
    "function": {
        "name": "get_current_weather",
        "description": "Get the current weather in a given location",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {"type": "string", "description": "The city and state, e.g. San Francisco, CA"},
                "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
            },
            "required": ["location"]
        }
    }
}

available_functions = {
    "get_current_weather": get_current_weather
} 