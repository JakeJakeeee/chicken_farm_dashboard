import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import LiveDashboard from './pages/LiveDashboard';
import Diagnostics from './pages/Diagnostics';
import HistoryExplorer from './pages/HistoryExplorer'; 
import Alerts from './pages/Alerts'; 
import './app.css'; 

function App() {
  const [activeTab, setActiveTab] = useState('live'); 
  
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
        const response = await fetch('http://localhost:1880/api/live');
        const sqlData = await response.json();

        if (sqlData && sqlData.length > 0) {
          const formattedArray = sqlData.map((item) => ({
            ...item,
            time: item.timestamp ? item.timestamp.split(', ')[1] : ''
          }));

          const newestReading = formattedArray[formattedArray.length - 1];
          setLatestData(newestReading);
          setDataHistory(formattedArray);
        }

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
        timerId = setTimeout(fetchDashboardData, 3000);
      }
    };

    fetchDashboardData(); 

    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  }, []);


  if (!latestData && activeTab === 'live') return <div className="loading-screen">Waiting for Node-RED SQLite transmission...</div>;

  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} handleLogout={handleLogout} />

      <div className="main-content" style={{ position: 'relative' }}>
        {activeTab === 'live' && <LiveDashboard latestData={latestData} dataHistory={dataHistory} />}
        {activeTab === 'explorer' && <HistoryExplorer />} 
        {activeTab === 'diagnostics' && <Diagnostics latestData={latestData} />}
        {activeTab === 'alerts' && <Alerts alerts={alerts} />}
      </div>
    </div>
  );
}

export default App;