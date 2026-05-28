
from dotenv import load_dotenv
load_dotenv("../.env")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import hopsworks
import joblib
import pandas as pd
import shap
import os

pearl_core = FastAPI(
    title="Pearl AQI Nexus",
    description="Predictive forecasting and explainability engine for atmospheric data.",
    version="3.0.0"
)

pearl_core.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

hw_connection = None
feature_vault = None
prophet_ensemble = None      
quantum_explainer = None     

@pearl_core.on_event("startup")
async def ignite_sequence():
    """Boot sequence: Locks into Hopsworks, downloads the brain, and warms up the explainer."""
    global hw_connection, feature_vault, prophet_ensemble, quantum_explainer
    
    print("[SYSTEM] Initiating Hopsworks Uplink...")
    hw_connection = hopsworks.login()
    feature_vault = hw_connection.get_feature_store()
    model_registry = hw_connection.get_model_registry()
    
    print("[SYSTEM] Downloading Prophet Ensemble (Version 1)...")
    champion_model = model_registry.get_model("pearl_aqi_random_forest", version=1)
    model_path = champion_model.download()
    prophet_ensemble = joblib.load(os.path.join(model_path, "random_forest_aqi.pkl"))
    
    print("[SYSTEM] Calibrating Quantum Explainer (SHAP)...")
    quantum_explainer = shap.TreeExplainer(prophet_ensemble)
    
    print("[SYSTEM] Pearl AQI Nexus is ONLINE.")


@pearl_core.get("/")
def ping_server():
    return {"status": "Nexus Online", "signal": "Optimal"}


@pearl_core.get("/api/v1/forecast")
def generate_forecast():
    """Fetches the latest atmospheric telemetry and computes a 3-day (72hr) forecast with SHAP insights."""
    global feature_vault, prophet_ensemble, quantum_explainer
    
    try:
        feature_view = feature_vault.get_feature_view(name="pearl_weather_view_v1", version=1)
        telemetry_matrix = feature_view.get_batch_data()
        telemetry_matrix = telemetry_matrix.sort_values('time').tail(72).reset_index(drop=True)
        
        timeline = telemetry_matrix['time'].astype(str).tolist()
        x_matrix = telemetry_matrix.drop(columns=['time', 'european_aqi'], errors='ignore')
        forecast_array = prophet_ensemble.predict(x_matrix)
        current_features = x_matrix.iloc[0:1]
        shap_matrix = quantum_explainer.shap_values(current_features)[0]
        
        feature_labels = x_matrix.columns.tolist()
        explainability_payload = []
        
        for i, feature in enumerate(feature_labels):
            explainability_payload.append({
                "metric": feature,
                "reading": round(float(current_features.iloc[0][feature]), 2),
                "impact": round(float(shap_matrix[i]), 2)
            })
            
        explainability_payload = sorted(explainability_payload, key=lambda x: abs(x['impact']), reverse=True)
        
        raw_baseline = quantum_explainer.expected_value
        if isinstance(raw_baseline, (list, pd.Series)) or type(raw_baseline).__name__ == 'ndarray':
            safe_baseline = raw_baseline[0]
        else:
            safe_baseline = raw_baseline

        return {
            "nexus_timestamp": timeline[0],
            "current_aqi": round(float(forecast_array[0]), 2),
            "baseline_aqi": round(float(safe_baseline), 2), 
            "drivers": explainability_payload,
            "horizon_forecast": [
                {"time": t, "predicted_aqi": round(float(aqi), 2)} 
                for t, aqi in zip(timeline, forecast_array)
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))