from contextlib import asynccontextmanager
from dotenv import load_dotenv
load_dotenv("../.env")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import hopsworks
import joblib
import pandas as pd
import shap
import os
import traceback
import logging

logger = logging.getLogger(__name__)

hopsworks_project = None
feature_store = None
model = None
explainer = None

FEATURE_COLS = ["pm10", "pm2_5", "nitrogen_dioxide", "hour", "day_of_week", "month", "aqi_momentum"]


def build_forecast_frame(last_known_row: pd.Series, last_known_time: pd.Timestamp, periods: int = 72) -> pd.DataFrame:
    future_times = pd.date_range(start=last_known_time + pd.Timedelta(hours=1), periods=periods, freq='h')

    rows = []
    for ts in future_times:
        rows.append({
            "pm10": last_known_row["pm10"],
            "pm2_5": last_known_row["pm2_5"],
            "nitrogen_dioxide": last_known_row["nitrogen_dioxide"],
            "hour": ts.hour,
            "day_of_week": ts.dayofweek,
            "month": ts.month,
            "aqi_momentum": 0.0,
        })

    return pd.DataFrame(rows, columns=FEATURE_COLS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global hopsworks_project, feature_store, model, explainer

    print("Connecting to Hopsworks...")
    hopsworks_project = hopsworks.login()
    feature_store = hopsworks_project.get_feature_store()

    model_registry = hopsworks_project.get_model_registry()
    print("Downloading latest model from registry...")
    registered_model = model_registry.get_best_model(
        name="pearl_aqi_random_forest",
        metric="R2",
        direction="max"
    )
    model_path = registered_model.download()
    model = joblib.load(os.path.join(model_path, "random_forest_aqi.pkl"))

    print("Initializing SHAP explainer...")
    explainer = shap.TreeExplainer(model)

    print("Pearl AQI Engine is online.")
    yield


pearl_core = FastAPI(
    title="Pearl AQI Engine",
    description="72-hour AQI forecast with SHAP explainability for Islamabad.",
    version="3.0.0",
    lifespan=lifespan
)

pearl_core.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@pearl_core.get("/")
def ping_server():
    return {"status": "online"}


@pearl_core.get("/api/v1/forecast")
def generate_forecast():
    if model is None or explainer is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Startup may have failed.")

    try:
        feature_view = feature_store.get_feature_view(name="pearl_weather_view_v1", version=1)
        df = feature_view.get_batch_data()
        df = df.sort_values('time').reset_index(drop=True)

        last_row = df.iloc[-1]
        last_known_time = pd.to_datetime(last_row['time'])

        forecast_frame = build_forecast_frame(last_row, last_known_time, periods=72)

        X = forecast_frame[FEATURE_COLS]
        forecast_array = model.predict(X)

        shap_values = explainer.shap_values(X.iloc[:1])
        shap_row = shap_values[0]

        drivers = []
        for i, feature in enumerate(FEATURE_COLS):
            drivers.append({
                "metric": feature,
                "reading": round(float(X.iloc[0][feature]), 2),
                "impact": round(float(shap_row[i]), 2)
            })
        drivers = sorted(drivers, key=lambda x: abs(x['impact']), reverse=True)

        raw_baseline = explainer.expected_value
        if isinstance(raw_baseline, (list, pd.Series)) or type(raw_baseline).__name__ == 'ndarray':
            safe_baseline = float(raw_baseline[0])
        else:
            safe_baseline = float(raw_baseline)

        future_times = pd.date_range(
            start=last_known_time + pd.Timedelta(hours=1),
            periods=len(forecast_array),
            freq='h'
        )
        future_timeline = future_times.astype(str).tolist()

        return {
            "generated_at": str(last_known_time),
            "current_aqi": round(float(forecast_array[0]), 2),
            "baseline_aqi": round(safe_baseline, 2),
            "drivers": drivers,
            "horizon_forecast": [
                {"time": t, "predicted_aqi": round(float(aqi), 2)}
                for t, aqi in zip(future_timeline, forecast_array)
            ]
        }

    except Exception as e:
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail="Forecast generation failed.")