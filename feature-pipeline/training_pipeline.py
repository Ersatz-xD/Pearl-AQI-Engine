import os
import time
import tempfile
import joblib
import hopsworks
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

FEATURE_COLS = [
    "pm10",
    "pm2_5",
    "nitrogen_dioxide",
    "hour",
    "day_of_week",
    "month",
    "aqi_momentum",
]


def run_training_pipeline():
    print("Connecting to Hopsworks...")
    project = hopsworks.login()
    fs = project.get_feature_store()

    print("Fetching feature data...")
    weather_fg = fs.get_feature_group(name="pearl_weather_features_v1", version=1)

    df = None
    for attempt in range(5):
        try:
            print(f"  -> Download attempt {attempt + 1}/5...")
            df = weather_fg.read()
            if df is not None:
                print(f"  -> {len(df)} rows downloaded.")
                break
        except Exception as e:
            print(f"  -> Attempt {attempt + 1} failed: {type(e).__name__}: {e}")
            time.sleep(15)

    if df is None:
        raise ConnectionError("Feature store read failed after 5 attempts.")

    df = df.sort_values("time").reset_index(drop=True)

    print("Preparing data splits...")
    X = df[FEATURE_COLS]
    y = df["european_aqi"]

    # shuffle=False preserves temporal order for time-series integrity
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)

    print(f"Training RandomForest (n_estimators=100, max_depth=10) on {len(X_train)} rows...")
    model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    r2 = r2_score(y_test, predictions)
    mae = mean_absolute_error(y_test, predictions)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    print(f"R2: {r2:.3f} | MAE: {mae:.2f} | RMSE: {rmse:.2f}")

    print("Pushing model artifact to Hopsworks registry...")
    mr = project.get_model_registry()

    with tempfile.TemporaryDirectory() as model_dir:
        joblib.dump(model, os.path.join(model_dir, "random_forest_aqi.pkl"))
        joblib.dump(FEATURE_COLS, os.path.join(model_dir, "feature_columns.pkl"))

        aqi_model = mr.python.create_model(
            name="pearl_aqi_random_forest",
            metrics={"R2": r2, "RMSE": rmse, "MAE": mae},
            description="Daily automated training run.",
        )
        aqi_model.save(model_dir)

    print("Training complete.")


if __name__ == "__main__":
    run_training_pipeline()