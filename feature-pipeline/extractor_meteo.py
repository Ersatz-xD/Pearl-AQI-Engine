import os
import requests
import pandas as pd
from datetime import datetime, timedelta
from dotenv import load_dotenv
import hopsworks

load_dotenv()


def fetch_historical_aqi(lat, lon, days=90):
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days + 1)

    url = "https://air-quality-api.open-meteo.com/v1/air-quality"
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        "hourly": ["european_aqi", "pm10", "pm2_5", "nitrogen_dioxide"],
    }

    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()

    data = response.json()
    df = pd.DataFrame(data["hourly"])
    df["time"] = pd.to_datetime(df["time"])
    return df


def engineer_features(df):
    df_engineered = df.copy()

    df_engineered["aqi_momentum"] = df_engineered["european_aqi"].diff()
    df_engineered = df_engineered.iloc[1:].reset_index(drop=True)

    df_engineered["european_aqi"] = df_engineered["european_aqi"].ffill()
    met_cols = ["pm10", "pm2_5", "nitrogen_dioxide"]
    df_engineered[met_cols] = df_engineered[met_cols].ffill().bfill()

    df_engineered["hour"] = df_engineered["time"].dt.hour
    df_engineered["day_of_week"] = df_engineered["time"].dt.dayofweek
    df_engineered["month"] = df_engineered["time"].dt.month

     

    return df_engineered


def push_to_feature_store(df):
    project = hopsworks.login()
    fs = project.get_feature_store()

    weather_fg = fs.get_or_create_feature_group(
        name="pearl_weather_features_v1",
        version=1,
        primary_key=["time"],
        event_time="time",
        description="Hourly AQI and met features for Islamabad",
    )

    print(f"Pushing {len(df)} rows to feature store...")
    weather_fg.insert(df)


if __name__ == "__main__":
    print(f"Fetching 90d of AQI data for Islamabad (33.6844, 73.0479)...")
    df_raw = fetch_historical_aqi(33.6844, 73.0479)

    print(f"Fetched {len(df_raw)} rows. Engineering features...")
    df_features = engineer_features(df_raw)

    print(f"Pushing {len(df_features)} rows to feature store...")
    push_to_feature_store(df_features)
    print("Done.")
