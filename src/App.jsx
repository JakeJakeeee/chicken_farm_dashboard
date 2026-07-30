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
  const [alerts, setAlerts] = useState([]);

  // 👇 1. NEW: Memory for alerts you have already "cleared/read"
  const [clearedAlertIds, setClearedAlertIds] = useState(() => {
    const saved = localStorage.getItem('farmClearedAlerts');
    return saved ? JSON.parse(saved) : [];
  });

  // 👇 2. NEW: Save cleared alerts to browser memory
  useEffect(() => {
    localStorage.setItem('farmClearedAlerts', JSON.stringify(clearedAlertIds));
  }, [clearedAlertIds]);

  // 👇 3. NEW: Function to Mark All As Read
  const handleClearNotifications = () => {
    const currentIds = alerts.map(a => a.id); // Get IDs of all current alerts
    setClearedAlertIds(currentIds); // Mark them all as read!
  };

  // 👇 4. NEW: Create a filtered list for the notification bell
  const unreadAlerts = alerts.filter(alert => !clearedAlertIds.includes(alert.id));

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
        {/* 👇 5. Pass BOTH the full list and the unread list to your pages */}
        {activeTab === 'live' && <LiveDashboard latestData={latestData} dataHistory={dataHistory} unreadAlerts={unreadAlerts} onClearNotifications={handleClearNotifications} />}
        {activeTab === 'explorer' && <HistoryExplorer />} 
        {activeTab === 'diagnostics' && <Diagnostics latestData={latestData} unreadAlerts={unreadAlerts} onClearNotifications={handleClearNotifications} />}
        {activeTab === 'alerts' && <Alerts alerts={alerts} unreadAlerts={unreadAlerts} onClearNotifications={handleClearNotifications} />}
      </div>
    </div>
  );
}

export default App;