import React, { useEffect, useState } from 'react';
import { auth } from './firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth'; 
import Login from './Login'; 

// IMPORT COMPONENTS
import Sidebar from './components/Sidebar';

// IMPORT PAGES
import LiveDashboard from './pages/LiveDashboard';
import Diagnostics from './pages/Diagnostics';
import HistoryExplorer from './pages/HistoryExplorer'; 
import Alerts from './pages/Alerts'; // <--- IMPORT THE NEW PAGE

import './app.css'; 

function App() {
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState('live'); 
  
  // GLOBAL DATA STATES
  const [dataHistory, setDataHistory] = useState([]);
  const [latestData, setLatestData] = useState(null);
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
    let isMounted = true; // Safety flag
    let timerId;

    const fetchLiveData = async () => {
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
          setDataHistory(formattedArray); // No need to slice, Node-RED already did it!

          // ALERT ENGINE
          const timeLabel = newestReading.time;
          let generatedAlerts = [];

          if (newestReading.sht_temperature > 35) generatedAlerts.push({ id: `temp_${timeLabel}`, type: 'danger', msg: `High SHT Temp Detected: ${newestReading.sht_temperature}°C`, time: timeLabel });
          if (newestReading.mq137_ammonia > 20) generatedAlerts.push({ id: `nh3_${timeLabel}`, type: 'danger', msg: `Dangerous Ammonia Levels: ${newestReading.mq137_ammonia} ppm`, time: timeLabel });
          if (newestReading.scd_co2 > 3000) generatedAlerts.push({ id: `co2_${timeLabel}`, type: 'warning', msg: `Elevated CO2: ${newestReading.scd_co2} ppm`, time: timeLabel });
          if (newestReading.scd_status === 0) generatedAlerts.push({ id: `scd_fault_${timeLabel}`, type: 'fault', msg: 'SCD41 I2C Sensor Disconnected', time: timeLabel });
          if (newestReading.mq_status === 0) generatedAlerts.push({ id: `mq_fault_${timeLabel}`, type: 'fault', msg: 'MQ137 Analog Pin Fault', time: timeLabel });

          if (generatedAlerts.length > 0) {
            setAlerts(prev => {
              const newUniqueAlerts = generatedAlerts.filter(a => !prev.some(p => p.id === a.id));
              const combined = [...newUniqueAlerts, ...prev];
              return combined.slice(0, 50); 
            });
          }
        }
      } catch (error) {
        console.error("Error fetching live SQL data:", error);
      }

      // CRITICAL FIX: Only queue the next fetch AFTER this one finishes!
      if (isMounted) {
        timerId = setTimeout(fetchLiveData, 3000);
      }
    };

    fetchLiveData(); // Start the loop

    // Cleanup function when component unmounts
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
        {activeTab === 'live' && <LiveDashboard latestData={latestData} dataHistory={dataHistory} alerts={alerts} setAlerts={setAlerts} />}
        {activeTab === 'explorer' && <HistoryExplorer />} 
        {activeTab === 'diagnostics' && <Diagnostics latestData={latestData} alerts={alerts} setAlerts={setAlerts} />}
        {/* NEW ROUTE FOR ALERTS PAGE */}
        {activeTab === 'alerts' && <Alerts alerts={alerts} setAlerts={setAlerts} />}
      </div>
    </div>
  );
}

export default App;