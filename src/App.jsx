import React, { useEffect, useState } from 'react';
import { auth } from './firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth'; 
import Login from './Login'; 

import Sidebar from './components/Sidebar';
import LiveDashboard from './pages/LiveDashboard';
import Diagnostics from './pages/Diagnostics';
import HistoryExplorer from './pages/HistoryExplorer'; 
import Alerts from './pages/Alerts'; 
import './app.css'; 

function App() {
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState('live'); 
  
  const [dataHistory, setDataHistory] = useState([]);
  const [latestData, setLatestData] = useState(null);
  
  // Kept: The main state to hold all alerts for the System Alerts page
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsCheckingAuth(false);
    });
    return () => unsubscribeAuth();
  }, []);

  const handleLogout = () => {
    signOut(auth);
    setLatestData(null); 
  };

  useEffect(() => {
    if (!user) return; 
    let isMounted = true; 
    let timerId;

    const fetchDashboardData = async () => {
      try {
        const response = await fetch('http://localhost:1880/api/live');
        const sqlData = await response.json();

        if (sqlData && sqlData.length > 0) {
          const formattedArray = sqlData.map((item) => ({
            ...item,
            fs_air_velocity: item.airflow || 0,
            time: item.timestamp ? item.timestamp.split(', ')[1] : ''
          }));

          const newestReading = formattedArray[formattedArray.length - 1];
          setLatestData(newestReading);
          setDataHistory(formattedArray);
        }

        // Kept: Fetching the alert history from your database
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
  }, [user]);

  if (isCheckingAuth) return <div className="loading-screen">Verifying Security Access...</div>;
  if (!user) return <Login />;
  if (!latestData && activeTab === 'live') return <div className="loading-screen">Waiting for Node-RED SQLite transmission...</div>;

  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} handleLogout={handleLogout} />

      <div className="main-content" style={{ position: 'relative' }}>
        {/* Removed alert props from Dashboard and Diagnostics */}
        {activeTab === 'live' && <LiveDashboard latestData={latestData} dataHistory={dataHistory} />}
        {activeTab === 'explorer' && <HistoryExplorer />} 
        {activeTab === 'diagnostics' && <Diagnostics latestData={latestData} />}
        
        {/* Kept: Passing the full alerts list to the Alerts page */}
        {activeTab === 'alerts' && <Alerts alerts={alerts} />}
      </div>
    </div>
  );
}

export default App;