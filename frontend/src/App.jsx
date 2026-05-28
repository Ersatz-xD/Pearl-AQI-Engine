import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell 
} from 'recharts';
import { Activity, Wind, AlertTriangle } from 'lucide-react';
import './App.css'; // Standard Vite CSS file

function App() {
  const [engineData, setEngineData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Fetch Data from our FastAPI Backend
  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const response = await axios.get('http://127.0.0.1:8000/api/v1/forecast');
        setEngineData(response.data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    fetchForecast();
  }, []);

  // 2. Dynamic Visual Alerts (EPA Standard Colors)
  const getAqiColor = (aqi) => {
    if (aqi <= 50) return '#10B981'; // Good (Green)
    if (aqi <= 100) return '#F59E0B'; // Moderate (Yellow)
    if (aqi <= 150) return '#F97316'; // Unhealthy for Sensitive (Orange)
    if (aqi <= 200) return '#EF4444'; // Unhealthy (Red)
    return '#8B5CF6'; // Very Unhealthy/Hazardous (Purple)
  };

  if (loading) return <div className="loading-screen">Booting Pearl Nexus...</div>;
  if (error) return <div className="error-screen"><AlertTriangle /> System Failure: {error}</div>;

  const currentColor = getAqiColor(engineData.current_aqi);

  return (
    <div className="dashboard-container" style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', backgroundColor: '#0F172A', color: '#F8FAFC', minHeight: '100vh' }}>
      
      {/* HEADER */}
      <header style={{ borderBottom: '1px solid #334155', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <Activity color="#38BDF8" /> Pearl AQI Nexus
        </h1>
        <p style={{ color: '#94A3B8', margin: '5px 0 0 0' }}>Live System Telemetry: {engineData.nexus_timestamp}</p>
      </header>

      {/* TOP METRIC: THE CURRENT AQI */}
      <section style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
        <div style={{ flex: 1, backgroundColor: '#1E293B', padding: '2rem', borderRadius: '12px', borderLeft: `8px solid ${currentColor}` }}>
          <h2 style={{ color: '#94A3B8', margin: '0 0 10px 0', fontSize: '1.2rem' }}>Current Air Quality Index</h2>
          <div style={{ fontSize: '4rem', fontWeight: 'bold', color: currentColor, lineHeight: '1' }}>
            {engineData.current_aqi}
          </div>
          <p style={{ color: '#94A3B8', marginTop: '10px' }}>Baseline Average: {engineData.baseline_aqi}</p>
        </div>
      </section>

      {/* THE CHARTS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        
        {/* CHART 1: SHAP EXPLAINABILITY */}
        <div style={{ backgroundColor: '#1E293B', padding: '1.5rem', borderRadius: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0 }}>
            <Wind color="#A78BFA" /> What is driving today's AQI? (AI Explainability)
          </h3>
          <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Our Random Forest calculates how much each weather metric pushes the AQI up (pollution) or down (clean air).
          </p>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engineData.drivers} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" stroke="#94A3B8" />
                <YAxis dataKey="metric" type="category" stroke="#94A3B8" width={100} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155' }} />
                <ReferenceLine x={0} stroke="#94A3B8" />
                <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
                  {
                    engineData.drivers.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.impact > 0 ? '#EF4444' : '#10B981'} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: 72-HOUR FORECAST */}
        <div style={{ backgroundColor: '#1E293B', padding: '1.5rem', borderRadius: '12px' }}>
          <h3 style={{ marginTop: 0 }}>72-Hour Horizon Forecast</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={engineData.horizon_forecast}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94A3B8" tickFormatter={(tick) => tick.split(' ')[1]} />
                <YAxis stroke="#94A3B8" />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155' }} />
                <Line type="monotone" dataKey="predicted_aqi" stroke="#38BDF8" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;