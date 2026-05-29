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

function App() {
  const [engineData, setEngineData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const response = await axios.get(
          "http://127.0.0.1:8000/api/v1/forecast",
        );
        setEngineData(response.data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    fetchForecast();
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
      const date = entry.time.split(" ")[0];
      if (!dailyData[date]) {
        dailyData[date] = [];
      }
      dailyData[date].push(entry.predicted_aqi);
    });

    const dates = Object.keys(dailyData);
    const futureDates = dates.slice(1, 4);

    return futureDates.map((date) => {
      const avg =
        dailyData[date].reduce((a, b) => a + b, 0) / dailyData[date].length;
      const [, month, day] = date.split("-");
      return {
        date: `${month}/${day}`,
        aqi: (Math.round(avg * 100) / 100).toFixed(2),
      };
    });
  };

  if (loading)
    return <div className="loading-screen">Consulting the oracle...</div>;

  if (error)
    return <div className="error-screen">System Malfunction: {error}</div>;

  const currentEaqi = engineData.current_aqi;
  const snark = getAqiSnark(currentEaqi);
  const activeColor = getEaqiColor(currentEaqi);
  const usAqiEstimate = convertEaqiToUsAqi(currentEaqi);
  const currentLabel = getEaqiLabel(currentEaqi);
  const dailyForecasts = getDailyForecasts(engineData.horizon_forecast);

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
        <div className="header-updated">
          Updated: {engineData.nexus_timestamp.split(" ")[1]}
        </div>
      </header>

      <section className="hero-card">
        <div className="hero-content">
          <div className="hero-left">
            <h2 className="hero-title">{snark}</h2>
            <p className="hero-subtitle">
              Based on a baseline average of {engineData.baseline_aqi} EAQI.
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
        {dailyForecasts.map((day, idx) => {
          const dayColor = getEaqiColor(day.aqi);
          const dayLabel = getEaqiLabel(day.aqi);
          return (
            <div
              key={idx}
              className="daily-card"
              style={{ borderTop: `6px solid ${dayColor}` }}
            >
              <div className="daily-date">{day.date}</div>
              <div
                className="serif-text daily-number"
                style={{ color: dayColor }}
              >
                {day.aqi}
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
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={engineData.drivers}
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
                  {engineData.drivers.map((entry, index) => (
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
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={engineData.horizon_forecast}>
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
