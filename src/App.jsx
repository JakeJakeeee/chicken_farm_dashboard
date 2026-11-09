import React, { useEffect, useState } from 'react';
import Login from './login.jsx';

import Sidebar from './components/Sidebar';
import LiveDashboard from './pages/LiveDashboard';
import Diagnostics from './pages/Diagnostics';
import HistoryExplorer from './pages/HistoryExplorer';
import Alerts from './pages/Alerts';
import FarmMap from './pages/FarmMap';
import './app.css';

function App() {
  // 1. Load SQLite user session from localStorage
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('farmAuthUser');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState('live');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [dataHistory, setDataHistory] = useState([]);
  const [latestData, setLatestData] = useState(null);
  const [alerts, setAlerts] = useState([]);

  // Clear button handler (wipes alerts_live table in SQLite)
  const handleClearLiveAlerts = async () => {
    try {
      await fetch('http://localhost:1880/api/alerts/clear', { method: 'POST' });
      setAlerts([]); // Immediately clear UI and Sidebar badge
    } catch (err) {
      console.error("Failed to clear live alerts:", err);
    }
  };

  // 2. Logout handler passed to Sidebar
  const handleLogout = () => {
    localStorage.removeItem('farmAuthUser');
    setUser(null);
    setLatestData(null);
  };

  // 3. Poll Node-RED SQLite endpoints only when logged in
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    let timerId;

    const formatRow = (item) => ({
      ...item,
      time: item?.timestamp ? String(item.timestamp).split(', ')[1] || String(item.timestamp) : ''
    });

    const fetchDashboardData = async () => {
      try {
        // 1. Fetch live sensor reading from /api/live
        const liveRes = await fetch('http://localhost:1880/api/live');
        if (liveRes.ok) {
          const liveJson = await liveRes.json();
          const liveArray = Array.isArray(liveJson) ? liveJson : (liveJson ? [liveJson] : []);

          if (liveArray.length > 0 && isMounted) {
            const formattedLive = liveArray.map(formatRow);
            const newestReading = formattedLive[formattedLive.length - 1];
            setLatestData(newestReading);
            setDataHistory(prev => (prev.length === 0 ? formattedLive : prev));
          }
        }

        // 2. Fetch full historical dataset from /api/history
        try {
          const histRes = await fetch('http://localhost:1880/api/history');
          if (histRes.ok) {
            const histJson = await histRes.json();
            const histArray = Array.isArray(histJson) ? histJson : (histJson ? [histJson] : []);
            if (histArray.length > 0 && isMounted) {
              const formattedHistory = histArray.map(formatRow);
              setDataHistory(formattedHistory);
              setLatestData(prev => prev || formattedHistory[formattedHistory.length - 1]);
            }
          }
        } catch (histErr) {
          // Fallback to /api/live data if /api/history is not reachable
        }

        // 3. Fetch LIVE alerts from /api/alerts/live
        try {
          const alertsRes = await fetch('http://localhost:1880/api/alerts/live');
          if (alertsRes.ok) {
            const rawText = await alertsRes.text();
            const alertsData = rawText.trim() ? JSON.parse(rawText) : [];
            if (Array.isArray(alertsData) && isMounted) {
              const formattedAlerts = alertsData.map(dbAlert => ({
                id: dbAlert.id,
                type: dbAlert.type,
                msg: dbAlert.message,
                time: dbAlert.timestamp_text
              }));
              setAlerts(formattedAlerts);
            } else if (isMounted) {
              setAlerts([]); // Empty when alerts_live table is cleared
            }
          }
        } catch (alertErr) {
          // Ignore alert endpoint errors
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }

      if (isMounted) {
        timerId = setTimeout(fetchDashboardData, 3000);
      }
    };

    fetchDashboardData();

    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  }, [user]);

  // Show SQLite Login / Register screen if not logged in
  if (!user) {
    return <Login onLoginSuccess={(loggedInUser) => setUser(loggedInUser)} />;
  }

  if (!latestData && activeTab === 'live') {
    return <div className="loading-screen">Waiting for Node-RED SQLite transmission...</div>;
  }

  return (
    <div className="app-layout">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        handleLogout={handleLogout}
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        alertCount={alerts.length}
      />

      <div className="main-content">
        {activeTab === 'live' && <LiveDashboard latestData={latestData} dataHistory={dataHistory} />}
        {activeTab === 'map' && (
          <FarmMap
            latestData={latestData}
            onSelectHouse={(houseId) => {
              localStorage.setItem('selectedFarmHouseId', houseId);
              setActiveTab('live');
            }}
          />
        )}
        {activeTab === 'explorer' && <HistoryExplorer />}
        {activeTab === 'diagnostics' && <Diagnostics latestData={latestData} />}
        {activeTab === 'alerts' && <Alerts alerts={alerts} onClearAlerts={handleClearLiveAlerts} />}
      </div>
    </div>
  );
}

export default App;