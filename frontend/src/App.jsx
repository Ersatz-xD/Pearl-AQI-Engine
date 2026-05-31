import { useState, useEffect } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { Sparkles, Wind } from "lucide-react";
import "./App.css";


const parseApiTimestamp = (ts) => {
  const cleanTs = ts.split("+")[0]; 
  const [datePart, timePart] = cleanTs.split(" ");
  
  const [year, month, day] = datePart.split("-").map(Number);
  const timeParts = timePart.split(":");
  
  const hour = Number(timeParts[0]);
  const minute = Number(timeParts[1]);
  const second = timeParts[2] ? Number(timeParts[2]) : 0;
  
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
};

function App() {
  const [engineData, setEngineData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchForecast = async () => {
      try {
        const response = await axios.get(
          "https://pearl-aqi-api.onrender.com/api/v1/forecast",
          { signal: controller.signal, timeout: 90000 }
        );
        setEngineData(response.data);
      } catch (err) {
        if (axios.isCancel(err)) return;
        if (err.code === "ECONNABORTED") {
          setError("The forecast engine is waking up. Please refresh in a moment.");
        } else {
          setError("Could not reach the forecast API.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
    return () => controller.abort();
  }, []);

  const getAqiSnark = (eaqi) => {
    if (eaqi <= 20)
      return "Air as crisp as a freshly ironed shirt. Go touch some grass.";
    if (eaqi <= 40)
      return "Not bad. A perfectly acceptable day to exist outdoors.";
    if (eaqi <= 60)
      return "It's getting a bit hazy. You can literally taste the city today.";
    if (eaqi <= 80)
      return "The air looks like soup. Consider breathing 20% less today.";
    return "Welcome to the apocalypse. N95 masks are the new fashion trend.";
  };

  const getEaqiLabel = (eaqi) => {
    if (eaqi <= 20) return "Good";
    if (eaqi <= 40) return "Fair";
    if (eaqi <= 60) return "Moderate";
    if (eaqi <= 80) return "Poor";
    return "Very Poor";
  };

  const getEaqiColor = (eaqi) => {
    if (eaqi <= 20) return "var(--forest-green)";
    if (eaqi <= 40) return "#8BA888";
    if (eaqi <= 60) return "#D4AF37";
    if (eaqi <= 80) return "var(--terracotta)";
    return "#8B0000";
  };

  const convertEaqiToUsAqi = (eaqi) => {
    if (eaqi <= 20) return Math.round(eaqi * 2.5);
    if (eaqi <= 40) return Math.round(50 + (eaqi - 20) * 2.5);
    if (eaqi <= 60) return Math.round(100 + (eaqi - 40) * 2.5);
    if (eaqi <= 80) return Math.round(150 + (eaqi - 60) * 2.5);
    return Math.round(200 + (eaqi - 80) * 5);
  };

  const getDailyForecasts = (forecast) => {
    if (!forecast) return [];
    const dailyData = {};

    forecast.forEach((entry) => {
      const utcMs = parseApiTimestamp(entry.time).getTime();
      const pktDate = new Date(utcMs + 5 * 60 * 60 * 1000);
      const date = pktDate.toISOString().split("T")[0];

      if (!dailyData[date]) dailyData[date] = [];
      dailyData[date].push(entry.predicted_aqi);
    });

    const dates = Object.keys(dailyData);
    const futureDates = dates.slice(0, 3);
    return futureDates.map((date) => {
      const avg =
        dailyData[date].reduce((a, b) => a + b, 0) / dailyData[date].length;
      const [, month, day] = date.split("-");
      return {
        date: `${month}/${day}`,
        aqi: Math.round(avg * 100) / 100,
      };
    });
  };

  if (loading)
    return <div className="loading-screen">Consulting the oracle...</div>;

  if (error)
    return <div className="error-screen">System Malfunction: {error}</div>;

  const currentEaqi = engineData?.current_aqi ?? 0;
  const baseline = engineData?.baseline_aqi ?? 0;
  const drivers = engineData?.drivers ?? [];
  const horizonForecast = engineData?.horizon_forecast ?? [];
  const generatedAt =
    (engineData?.generated_at ?? engineData?.nexus_timestamp ?? "")
      .split(" ")[1] ?? "—";

  const snark = getAqiSnark(currentEaqi);
  const activeColor = getEaqiColor(currentEaqi);
  const usAqiEstimate = convertEaqiToUsAqi(currentEaqi);
  const currentLabel = getEaqiLabel(currentEaqi);
  const dailyForecasts = getDailyForecasts(horizonForecast);

  return (
    <div className="dashboard-container">
      <header className="header">
        <div>
          <h1 className="header-title">
            <i className="highlight-text">Pearl</i> AQI Engine
          </h1>
          <p className="header-subtitle">
            Islamabad Telemetry • Powered by Hopsworks & MLflow
          </p>
        </div>
        <div className="header-updated">Updated: {generatedAt}</div>
      </header>

      <section className="hero-card">
        <div className="hero-content">
          <div className="hero-left">
            <h2 className="hero-title">{snark}</h2>
            <p className="hero-subtitle">
              Based on a baseline average of {baseline} EAQI.
            </p>
          </div>

          <div className="hero-right">
            <div className="hero-label">European AQI</div>
            <div
              className="serif-text hero-number"
              style={{ color: activeColor }}
            >
              {currentEaqi}
            </div>
            <div className="hero-status" style={{ color: activeColor }}>
              {currentLabel}
            </div>
            <div className="hero-us-epa">
              US EPA Equivalent:{" "}
              <strong className="us-epa-bold">{usAqiEstimate}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="daily-forecast-grid">
        {dailyForecasts.map((day) => {
          const dayColor = getEaqiColor(day.aqi);
          const dayLabel = getEaqiLabel(day.aqi);
          return (
            <div
              key={day.date}
              className="daily-card"
              style={{ borderTop: `6px solid ${dayColor}` }}
            >
              <div className="daily-date">{day.date}</div>
              <div
                className="serif-text daily-number"
                style={{ color: dayColor }}
              >
                {day.aqi.toFixed(2)}
              </div>
              <div className="daily-label">{dayLabel}</div>
            </div>
          );
        })}
      </section>

      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">
            <Sparkles size={28} color="var(--terracotta)" /> The "Why"
          </h3>
          <p className="chart-subtitle">
            What is driving the pollution up (terracotta) or cleaning it out
            (green)?
          </p>
          <div className="chart-container" style={{ minHeight: "400px" }}>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={drivers}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  horizontal={false}
                />
                <XAxis type="number" stroke="var(--muted-text)" />
                <YAxis
                  dataKey="metric"
                  type="category"
                  stroke="var(--off-white)"
                  width={140}
                  tick={{ fontFamily: "DM Sans", fontSize: "1.1rem" }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.02)" }}
                  contentStyle={{
                    backgroundColor: "var(--card-dark)",
                    border: "none",
                    borderRadius: "8px",
                    color: "var(--off-white)",
                  }}
                />
                <ReferenceLine x={0} stroke="rgba(255,255,255,0.2)" />
                <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
                  {drivers.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.impact > 0
                          ? "var(--terracotta)"
                          : "var(--forest-green)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">
            <Wind size={28} color="var(--forest-green)" /> The Horizon
          </h3>
          <p className="chart-subtitle">
            72-hour predictive modeling (EAQI Scale).
          </p>
          <div className="chart-container" style={{ minHeight: "400px" }}>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={horizonForecast}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="time"
                  stroke="var(--muted-text)"
                  tick={{ fontSize: "1rem" }}
                  tickFormatter={(tick) => {
                    const [datePart, timePart] = tick.split(" ");
                    const [, month, day] = datePart.split("-");
                    const hour = timePart.slice(0, 5);
                    return `${month}/${day} ${hour}`;
                  }}
                />
                <YAxis stroke="var(--muted-text)" tick={{ fontSize: "1rem" }} />
                <Tooltip
                  cursor={{ stroke: "rgba(255,255,255,0.1)" }}
                  contentStyle={{
                    backgroundColor: "var(--card-dark)",
                    border: "none",
                    borderRadius: "8px",
                    color: "var(--off-white)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="predicted_aqi"
                  stroke="var(--terracotta)"
                  strokeWidth={4}
                  dot={false}
                  activeDot={{ r: 8, fill: "var(--terracotta)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;