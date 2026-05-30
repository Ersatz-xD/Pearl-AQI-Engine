
# Pearl AQI Engine

> An end-to-end, serverless Machine Learning pipeline predicting Islamabad's Air Quality Index with real-time AI explainability.

I engineered the Pearl AQI Engine to move beyond simple "black-box" weather predictions. This project is a fully automated MLOps pipeline that not only forecasts the air quality for the next 72 hours but actively explains *why* the air is clean or polluted based on real-time atmospheric drivers. 

### Live Deployment
* **Interactive Dashboard (Frontend):** [pearl-aqi-engine.vercel.app](https://pearl-aqi-engine.vercel.app)
* **ML Inference Engine (API):** [pearl-aqi-api.onrender.com](https://pearl-aqi-api.onrender.com/api/v1/forecast)

---

## System Architecture

I designed the system using a decoupled, 3-tier architecture to ensure high availability, scalability, and strict environment synchronization:

1. **The Feature Pipeline (Data Engineering - Python 3.11)**
   * **Source:** Extracts historical and live telemetry from the OpenMeteo API.
   * **Processing:** Engineers time-series features and calculates mathematical derivatives like `aqi_momentum`.
   * **Storage:** Pushes clean DataFrames directly to the **Hopsworks Feature Store**.
   * **Automation:** Triggered hourly via GitHub Actions cron schedules.

2. **The Training Pipeline (Machine Learning - Python 3.10)**
   * **Brain:** A `RandomForestRegressor` trained on historical data. Random Forest was selected over Gradient Boosting to ensure maximum architectural stability for unsupervised CI/CD runs.
   * **Evaluation:** Continuously tracked and evaluated using **MLflow**.
   * **Deployment:** Automatically versions and pushes the champion model to the **Hopsworks Model Registry**.
   * **Automation:** Triggered daily via GitHub Actions.

3. **The Inference Engine & UI (Production Delivery)**
   * **Backend (Render):** A lightweight **FastAPI** server running Python 3.10 (to match the training pipeline's C-bindings). It downloads the latest model, computes the 72-hour forecast, and calculates feature importance using SHAP. 
   * **Frontend (Vercel):** A custom **React** and **Recharts** dashboard featuring an editorial dark-mode aesthetic, split-second loading states, and dynamic dual-scale translation (European AQI to US EPA AQI).

---

## Technology Stack

| Category | Technologies Used |
| :--- | :--- |
| **Core ML & Data** | Python 3.10/3.11, Pandas, Scikit-learn, Numpy, SHAP |
| **MLOps & Infrastructure** | Hopsworks (Feature Store & Registry), MLflow, GitHub Actions |
| **Backend API** | FastAPI, Uvicorn, Render |
| **Frontend UI** | React, Vite, Recharts, Lucide-React, Vercel |

---

## Key Features

* **AI Explainability (The "Why"):** Instead of just returning a number, the engine utilizes TreeSHAP to calculate the impact of each environmental feature (e.g., Nitrogen Dioxide, Wind Speed) and visualizes whether it is driving pollution up or cleaning the air out.
* **Asynchronous Resiliency:** The React frontend utilizes optional chaining and dedicated loading states to prevent UI crashes while awaiting the heavy ML computations from the Render API.
* **100% Serverless CI/CD:** Zero dedicated infrastructure for training. Data ingestion and model retraining run entirely autonomously via GitHub Actions.
* **Zero-Downtime Updates:** The API always fetches the latest registered `production_model` from Hopsworks, meaning the ML model updates itself seamlessly without requiring backend restarts.

---

## Local Setup & Installation

If you wish to run the Pearl AQI Engine locally for development, follow these steps:

### 1. Environment Configuration
Clone the repository and set up your environment variables. You will need a free API key from Hopsworks.
```bash
git clone https://github.com/Ersatz-xD/Pearl-AQI-Engine.git
cd Pearl-AQI-Engine

# Create a .env file in the root directory
echo "HOPSWORKS_API_KEY=your_key_here" > .env

```

### 2. Booting the FastAPI Backend

Initialize a virtual environment, install the API-specific requirements, and start the local server.

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

## License & Contact

Developed as a complete MLOps and Full-Stack Engineering portfolio project.
Feel free to open an issue or reach out if you have questions regarding the architecture, dependency management, or implementation details!



