import os
import time
import joblib
import hopsworks
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

def run_training_pipeline():
    print("1. Connecting to Hopsworks...")
    project = hopsworks.login()
    fs = project.get_feature_store()

    print("2. Fetching the latest feature data (with Fault Tolerance)...")
    weather_fg = fs.get_feature_group(name="pearl_weather_features_v1", version=1)
    
    #RETRY LOGIC
    df = None
    for attempt in range(5):
        try:
            print(f"  -> Download attempt {attempt + 1}/5...")
            df = weather_fg.show(500)
            if df is not None:
                print("  -> Data downloaded successfully!")
                break
        except Exception as e:
            print(f"  -> Server busy. Retrying in 15 seconds...")
            time.sleep(15)
            
    if df is None:
        raise ConnectionError("Hopsworks stream completely blocked after 5 attempts. Try again later.")

    df = df.sort_values('time').reset_index(drop=True)

    print("3. Preparing data splits...")
    X = df.drop(columns=['time', 'european_aqi'])
    y = df['european_aqi']
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)

    print("4. Training the Random Forest Champion...")
    model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)
    predictions = model.predict(X_test)

    print("5. Calculating performance metrics...")
    r2 = r2_score(y_test, predictions)
    mae = mean_absolute_error(y_test, predictions)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    print(f"Scores -> R2: {r2:.3f}, MAE: {mae:.2f}")

    print("6. Registering new model version in the cloud...")
    mr = project.get_model_registry()
    
    model_dir = "production_model"
    os.makedirs(model_dir, exist_ok=True)
    joblib.dump(model, f"{model_dir}/random_forest_aqi.pkl")

    aqi_model = mr.python.create_model(
        name="pearl_aqi_random_forest", 
        metrics={"R2": r2, "RMSE": rmse, "MAE": mae},
        description="Automated daily training pipeline run."
    )
    aqi_model.save(model_dir)
    print("Success! CI/CD Pipeline complete.")

if __name__ == "__main__":
    run_training_pipeline()