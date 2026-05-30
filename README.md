
# Pearl AQI Engine

> An end-to-end, serverless Machine Learning pipeline predicting Islamabad's Air Quality Index with real-time AI explainability.

I engineered the Pearl AQI Engine to move beyond simple black-box weather predictions. This project is a fully automated MLOps pipeline that not only forecasts the air quality for the next 72 hours but actively explains *why* the air is clean or polluted based on real-time atmospheric drivers. 

Built entirely on a serverless architecture, it autonomously ingests data, evaluates model performance, and serves predictions to a custom-designed, editorial-style React dashboard.

---

##  System Architecture

I designed the system using a decoupled, 3-tier architecture to ensure scalability and maintainability:

1. **The Feature Pipeline (Data Engineering)**
   * **Source:** Extracts historical and live telemetry from the OpenMeteo API.
   * **Processing:** Engineers time-series features (hour, day, month) and calculates mathematical derivatives like `aqi_momentum`.
   * **Storage:** Pushes clean DataFrames directly to the **Hopsworks Feature Store**, bypassing static `.csv` files entirely for point-in-time correctness.
   * **Automation:** Triggered hourly via GitHub Actions.

2. **The Training Pipeline (Machine Learning)**
   * **Brain:** A `RandomForestRegressor` trained on historical data.
   * **Evaluation:** Continuously evaluates against strict R², MAE, and RMSE thresholds.
   * **Deployment:** Automatically versions and pushes the champion model to the **Hopsworks Model Registry**.
   * **Automation:** Triggered daily via GitHub Actions.

3. **The Inference Engine & UI (Full-Stack Delivery)**
   * **Backend:** A lightweight **FastAPI** server that pulls the latest model and features, runs the 72-hour forecast, and calculates feature importance (SHAP).
   * **Frontend:** A custom **React** and **Recharts** dashboard featuring an editorial dark-mode aesthetic, dynamic color-coding, and dual-scale translation (European AQI to US EPA AQI).

---

## 🛠️ Technology Stack

| Category | Technologies Used |
| :--- | :--- |
| **Core ML & Data** | Python 3.10, Pandas, Scikit-learn, Numpy |
| **MLOps & Infrastructure** | Hopsworks (Feature Store & Model Registry), MLflow, GitHub Actions |
| **Backend API** | FastAPI, Uvicorn |
| **Frontend UI** | React, Vite, Recharts, Lucide-React, Custom CSS |

---

##  Key Features

* **AI Explainability (The "Why"):** Instead of just returning a number, the engine calculates the impact of each environmental feature (e.g., Nitrogen Dioxide, Wind Speed) and visualizes whether it is driving pollution up or cleaning the air out.
* **Dual-Scale Telemetry:** The model natively predicts the **European AQI** for high-fidelity scientific accuracy, while the frontend dynamically translates this into the standard **US EPA AQI** for user accessibility.
* **100% Serverless CI/CD:** Zero dedicated servers. The data ingestion and model retraining run entirely on GitHub Actions cron schedules (`27 * * * *` and `30 2 * * *`).
* **Zero-Downtime Updates:** The API always fetches the latest registered `production_model` from Hopsworks, meaning the ML model updates itself seamlessly without requiring backend restarts.

---

##  Local Setup & Installation

If you wish to run the Pearl AQI Engine locally, follow these steps:

### 1. Environment Configuration
Clone the repository and set up your environment variables. You will need a free API key from Hopsworks.
```bash
git clone https://github.com/Ersatz-xD/Pearl-AQI-Engine.git
cd Pearl-AQI-Engine

# Create a .env file in the root directory
echo "HOPSWORKS_API_KEY=your_key_here" > .env

```

### 2. Booting the FastAPI Backend

Initialize a virtual environment, install the requirements, and start the local server.

```bash
cd api
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn main:pearl_core --reload

```

### 3. Launching the React Dashboard

Open a new terminal window, install the Node dependencies, and start the Vite development server.

```bash
cd frontend
npm install
npm run dev

```

Visit `http://localhost:5173` to view the live dashboard.

---

## 📝 License & Contact

Developed as a complete MLOps and Full-Stack Engineering portfolio project.
Feel free to open an issue or reach out if you have questions regarding the architecture or implementation details!



