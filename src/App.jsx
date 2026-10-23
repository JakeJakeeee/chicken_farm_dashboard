import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import LiveDashboard from './pages/LiveDashboard';
import Diagnostics from './pages/Diagnostics';
import HistoryExplorer from './pages/HistoryExplorer'; 
import Alerts from './pages/Alerts'; 
import './app.css'; 

function App() {
  const [activeTab, setActiveTab] = useState('live'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [dataHistory, setDataHistory] = useState([]);
  const [latestData, setLatestData] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const handleLogout = () => {
    console.log("Logout disabled - authentication removed.");
  };

  useEffect(() => {
    let isMounted = true; 
    let timerId;

    const formatRow = (item) => ({
      ...item,
      time: item?.timestamp ? String(item.timestamp).split(', ')[1] || String(item.timestamp) : ''
    });

    const fetchDashboardData = async () => {
      try {
        // 1. Fetch live reading from /api/live
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

        // 3. Fetch alerts from /api/alerts
        try {
          const alertsRes = await fetch('http://localhost:1880/api/alerts');
          if (alertsRes.ok) {
            const alertsData = await alertsRes.json();
            if (Array.isArray(alertsData) && isMounted) {
              const formattedAlerts = alertsData.map(dbAlert => ({
                id: dbAlert.id,
                type: dbAlert.type,
                msg: dbAlert.message,
                time: dbAlert.timestamp_text
              }));
              setAlerts(formattedAlerts);
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
  }, []);

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

      <div className="main-content" style={{ position: 'relative' }}>
        {!isSidebarOpen && (
          <button 
            className="unhide-sidebar-btn" 
            onClick={() => setIsSidebarOpen(true)}
            title="Show Sidebar"
          >
            ☰ Menu
          </button>
        )}

        {activeTab === 'live' && <LiveDashboard latestData={latestData} dataHistory={dataHistory} />}
        {activeTab === 'explorer' && <HistoryExplorer />} 
        {activeTab === 'diagnostics' && <Diagnostics latestData={latestData} />}
        {activeTab === 'alerts' && <Alerts alerts={alerts} />}
      </div>
    </div>
  );
}

export default App;