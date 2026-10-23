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

    const fetchDashboardData = async () => {
      try {
        // 1. Fetch the single latest reading for instant UI updates
        const liveRes = await fetch('http://localhost:1880/api/live');
        const liveJson = await liveRes.json();
        
        if (liveJson && liveJson.length > 0) {
          const newest = liveJson[0]; // Assuming /api/live returns the latest 1 row
          setLatestData({
            ...newest,
            time: newest.timestamp ? newest.timestamp.split(', ')[1] || newest.timestamp : ''
          });
        }

        // 2. Fetch the 200+ rows for the charts and averages
        const histRes = await fetch('http://localhost:1880/api/history');
        const histJson = await histRes.json();

        if (histJson && histJson.length > 0) {
          // If Node-RED sends DESC (newest first), reverse it for Recharts (oldest to newest)
          const sortedHistory = histJson.reverse(); 
          
          const formattedHistory = sortedHistory.map((item) => ({
            ...item,
            time: item.timestamp ? item.timestamp.split(', ')[1] || item.timestamp : ''
          }));
          setDataHistory(formattedHistory);
        }

        // 3. Fetch Alerts
        const alertsRes = await fetch('http://localhost:1880/api/alerts');
        const alertsData = await alertsRes.json();
        
        if (alertsData && isMounted) {
          const formattedAlerts = alertsData.map(dbAlert => ({
            id: dbAlert.id,
            type: dbAlert.type,
            msg: dbAlert.message,
            time: dbAlert.timestamp_text
          }));
          setAlerts(formattedAlerts);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }

      if (isMounted) {
        // Poll every 3 seconds
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
        {/* When sidebar is hidden, show floating button on top-left to unhide it */}
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