import requests
import pandas as pd
from datetime import datetime, timedelta

def fetch_historical_aqi(lat, lon, days=90):
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days)
    
    url = "https://air-quality-api.open-meteo.com/v1/air-quality"
    
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        "hourly": ["european_aqi", "pm10", "pm2_5", "nitrogen_dioxide"]
    }
    
    response = requests.get(url, params=params)
    response.raise_for_status() 
    
    data = response.json()
    df = pd.DataFrame(data['hourly'])
    df['time'] = pd.to_datetime(df['time'])
    
    return df

def engineer_features(df):
    df_engineered = df.copy()
    df_engineered = df_engineered.dropna().reset_index(drop=True)
    
    df_engineered['hour'] = df_engineered['time'].dt.hour
    df_engineered['day_of_week'] = df_engineered['time'].dt.dayofweek
    df_engineered['month'] = df_engineered['time'].dt.month
    
    df_engineered['aqi_momentum'] = df_engineered['european_aqi'].diff().fillna(0)
    
    return df_engineered

if __name__ == "__main__":
    print("Fetching data from OpenMeteo for Islamabad...")
    df_raw = fetch_historical_aqi(33.6844, 73.0479)
    
    print("Engineering features...")
    df_features = engineer_features(df_raw)
    
    print("Pipeline successful! Data sample:")
    print(df_features[['time', 'european_aqi', 'aqi_momentum']].head())