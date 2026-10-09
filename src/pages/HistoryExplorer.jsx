import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function HistoryExplorer() {
  const [pulledHistory, setPulledHistory] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [sensorToggles, setSensorToggles] = useState({
    sht_temperature: true,
    bmp_temperature: false,
    scd_temperature: false,
    sht_humidity: true,
    scd_humidity: false,
    scd_co2: true,
    mq137_ammonia: true,
    bmp_pressure: false,
    fs_air_velocity: true
  });

  // THE TIMEZONE FIX: Safely translate "14/07/2026, 10:20:01 PM" into perfect local milliseconds
  const parseNodeRedDate = (dateString) => {
    if (!dateString) return 0;
    try {
      const [datePart, timePart] = dateString.split(', ');
      const [day, month, year] = datePart.split('/');
      const [time, meridian] = timePart.split(' ');
      let [hours, minutes, seconds] = time.split(':');
      
      hours = parseInt(hours, 10);
      if (meridian === 'PM' && hours < 12) hours += 12;
      if (meridian === 'AM' && hours === 12) hours = 0;
      
      const formattedHours = hours.toString().padStart(2, '0');
      
      // Standardize into ISO 8601 so JS parses it flawlessly in your local timezone
      const isoString = `${year}-${month}-${day}T${formattedHours}:${minutes}:${seconds}`;
      return new Date(isoString).getTime();
    } catch (error) {
      return 0; // Fallback to avoid breaking the app
    }
  };

  const fetchCustomHistory = async () => {
    if (!startDate || !endDate) {
      alert("Please select both a Start and End date/time.");
      return;
    }
    
    setIsFetching(true);
    
    const startMillis = new Date(startDate).getTime();
    
    // THE 59-SECOND FIX: Append 59,999 milliseconds to the end date 
    const endMillis = new Date(endDate).getTime() + 59999; 

    try {
      const response = await fetch('http://localhost:1880/api/history');
      const sqlData = await response.json();

      if (sqlData && sqlData.length > 0) {
        const formattedArray = sqlData.map((item) => ({
          ...item,
          sht_temperature: item.sht_temperature || 0,
          bmp_temperature: item.bmp_temperature || 0,
          scd_temperature: item.scd_temperature || 0,
          sht_humidity: item.sht_humidity || 0,
          scd_humidity: item.scd_humidity || 0,
          scd_co2: item.scd_co2 || 0,
          mq137_ammonia: item.mq137_ammonia || 0,
          bmp_pressure: item.bmp_pressure || 0,
          fs_air_velocity: item.airflow || 0, 
          sht_status: item.sht_status !== undefined ? item.sht_status : 1,
          bmp_status: item.bmp_status !== undefined ? item.bmp_status : 1,
          scd_status: item.scd_status !== undefined ? item.scd_status : 1,
          mq_status: item.mq_status !== undefined ? item.mq_status : 1,
          fs_status: item.fs_status !== undefined ? item.fs_status : 1,
          
          // THE FIX: Pull the pure millisecond number directly from the database!
          timestamp_ms: item.timestamp_ms || 0, 
          time: item.timestamp ? item.timestamp.split(', ')[1] : '' 
        }));

        const filteredData = formattedArray.filter(row => {
          // THE FIX: Compare the raw numbers natively. No text parsing required!
          return row.timestamp_ms >= startMillis && row.timestamp_ms <= endMillis;
        });

        if (filteredData.length > 0) {
          setPulledHistory(filteredData);
        } else {
          setPulledHistory([]);
          alert("No data found for this specific time period.");
        }
      } else {
        setPulledHistory([]);
        alert("The SQL Database is currently empty.");
      }
    } catch (error) {
      console.error("Error fetching SQL history:", error);
      alert("Failed to connect to Node-RED API. Ensure Node-RED is running.");
    }
    
    setIsFetching(false);
  };

  const handleToggle = (sensor) => {
    setSensorToggles(prev => ({ ...prev, [sensor]: !prev[sensor] }));
  };

  const exportToCSV = () => {
    if (pulledHistory.length === 0) return;

    const headers = ['Timestamp'];
    if (sensorToggles.sht_temperature) headers.push('SHT Temp (C)');
    if (sensorToggles.bmp_temperature) headers.push('BMP Temp (C)');
    if (sensorToggles.scd_temperature) headers.push('SCD Temp (C)');
    if (sensorToggles.sht_humidity) headers.push('SHT Humidity (%)');
    if (sensorToggles.scd_humidity) headers.push('SCD Humidity (%)');
    if (sensorToggles.scd_co2) headers.push('CO2 (ppm)');
    if (sensorToggles.mq137_ammonia) headers.push('Ammonia (ppm)');
    if (sensorToggles.bmp_pressure) headers.push('Pressure (hPa)');
    if (sensorToggles.fs_air_velocity) headers.push('Air Velocity (m/s)');

    const csvRows = [...pulledHistory].reverse().map(row => {
      const rowData = [`"${row.timestamp || row.time}"`]; 
      
      if (sensorToggles.sht_temperature) rowData.push(row.sht_status === 0 ? 'Offline' : row.sht_temperature);
      if (sensorToggles.bmp_temperature) rowData.push(row.bmp_status === 0 ? 'Offline' : row.bmp_temperature);
      if (sensorToggles.scd_temperature) rowData.push(row.scd_status === 0 ? 'Offline' : row.scd_temperature);
      if (sensorToggles.sht_humidity) rowData.push(row.sht_status === 0 ? 'Offline' : row.sht_humidity);
      if (sensorToggles.scd_humidity) rowData.push(row.scd_status === 0 ? 'Offline' : row.scd_humidity);
      if (sensorToggles.scd_co2) rowData.push(row.scd_status === 0 ? 'Offline' : row.scd_co2);
      if (sensorToggles.mq137_ammonia) rowData.push(row.mq_status === 0 ? 'Offline' : row.mq137_ammonia);
      if (sensorToggles.bmp_pressure) rowData.push(row.bmp_status === 0 ? 'Offline' : row.bmp_pressure);
      if (sensorToggles.fs_air_velocity) rowData.push(row.fs_status === 0 ? 'Offline' : row.fs_air_velocity);
      return rowData.join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `Farm_Data_Export_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="explorer-container">
      <div className="header">
        <h1>History Explorer</h1>
        <p>Retrieve history data</p>
      </div>

      <div className="control-panel">
        <div className="date-selectors">
          <div className="input-group">
            <label>Start Time:</label>
            <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="input-group">
            <label>End Time:</label>
            <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <button className="fetch-btn" onClick={fetchCustomHistory} disabled={isFetching}>
            {isFetching ? 'Loading...' : '🔍 Fetch Data'}
          </button>
        </div>

        <div className="sensor-toggles" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '15px' }}>
          <label className="toggle-label"><input type="checkbox" checked={sensorToggles.sht_temperature} onChange={() => handleToggle('sht_temperature')} /> SHT Temp</label>
          <label className="toggle-label"><input type="checkbox" checked={sensorToggles.bmp_temperature} onChange={() => handleToggle('bmp_temperature')} /> BMP Temp</label>
          <label className="toggle-label"><input type="checkbox" checked={sensorToggles.scd_temperature} onChange={() => handleToggle('scd_temperature')} /> SCD Temp</label>
          <label className="toggle-label"><input type="checkbox" checked={sensorToggles.sht_humidity} onChange={() => handleToggle('sht_humidity')} /> SHT Hum</label>
          <label className="toggle-label"><input type="checkbox" checked={sensorToggles.scd_humidity} onChange={() => handleToggle('scd_humidity')} /> SCD Hum</label>
          <label className="toggle-label"><input type="checkbox" checked={sensorToggles.scd_co2} onChange={() => handleToggle('scd_co2')} /> CO2</label>
          <label className="toggle-label"><input type="checkbox" checked={sensorToggles.mq137_ammonia} onChange={() => handleToggle('mq137_ammonia')} /> Ammonia</label>
          <label className="toggle-label"><input type="checkbox" checked={sensorToggles.bmp_pressure} onChange={() => handleToggle('bmp_pressure')} /> Pressure</label>
          <label className="toggle-label"><input type="checkbox" checked={sensorToggles.fs_air_velocity} onChange={() => handleToggle('fs_air_velocity')} /> Air Velocity</label>
        </div>
      </div>

      {pulledHistory.length > 0 ? (
        <>
          <div className="chart-container custom-chart" style={{ background: 'white', padding: '20px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h3>Found {pulledHistory.length} Data Points</h3>
            <ResponsiveContainer width="100%" height={450}>
              <LineChart data={pulledHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                {sensorToggles.sht_temperature && <Line yAxisId="left" type="monotone" dataKey="sht_temperature" stroke="#e74c3c" name="SHT Temp" dot={false} />}
                {sensorToggles.bmp_temperature && <Line yAxisId="left" type="monotone" dataKey="bmp_temperature" stroke="#8e44ad" name="BMP Temp" dot={false} />}
                {sensorToggles.scd_temperature && <Line yAxisId="left" type="monotone" dataKey="scd_temperature" stroke="#e67e22" name="SCD Temp" dot={false} />}
                {sensorToggles.sht_humidity && <Line yAxisId="left" type="monotone" dataKey="sht_humidity" stroke="#3498db" name="SHT Humidity" dot={false} />}
                {sensorToggles.scd_humidity && <Line yAxisId="left" type="monotone" dataKey="scd_humidity" stroke="#1abc9c" name="SCD Humidity" dot={false} />}
                {sensorToggles.scd_co2 && <Line yAxisId="right" type="monotone" dataKey="scd_co2" stroke="#2ecc71" name="CO2" dot={false} />}
                {sensorToggles.mq137_ammonia && <Line yAxisId="right" type="monotone" dataKey="mq137_ammonia" stroke="#9b59b6" name="Ammonia" dot={false} />}
                {sensorToggles.bmp_pressure && <Line yAxisId="left" type="monotone" dataKey="bmp_pressure" stroke="#34495e" name="Pressure" dot={false} />}
                {sensorToggles.fs_air_velocity && <Line yAxisId="left" type="monotone" dataKey="fs_air_velocity" stroke="#16a085" name="Air Velocity" dot={false} />}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="table-container" style={{ background: 'white', padding: '20px', borderRadius: '10px', overflowX: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>Raw Data Log</h3>
              <button 
                onClick={exportToCSV} 
                style={{ backgroundColor: '#3498db', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
              >
                📥 Export CSV
              </button>
            </div>

            <table className="history-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ecf0f1' }}>
                  <th style={{ padding: '10px' }}>Timestamp</th>
                  {sensorToggles.sht_temperature && <th style={{ padding: '10px' }}>SHT Temp (°C)</th>}
                  {sensorToggles.bmp_temperature && <th style={{ padding: '10px' }}>BMP Temp (°C)</th>}
                  {sensorToggles.scd_temperature && <th style={{ padding: '10px' }}>SCD Temp (°C)</th>}
                  {sensorToggles.sht_humidity && <th style={{ padding: '10px' }}>SHT Hum (%)</th>}
                  {sensorToggles.scd_humidity && <th style={{ padding: '10px' }}>SCD Hum (%)</th>}
                  {sensorToggles.scd_co2 && <th style={{ padding: '10px' }}>CO2 (ppm)</th>}
                  {sensorToggles.mq137_ammonia && <th style={{ padding: '10px' }}>Ammonia (ppm)</th>}
                  {sensorToggles.bmp_pressure && <th style={{ padding: '10px' }}>Pressure (hPa)</th>}
                  {sensorToggles.fs_air_velocity && <th style={{ padding: '10px' }}>Air Velocity (m/s)</th>}
                </tr>
              </thead>
              <tbody>
                {[...pulledHistory].reverse().map((row, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #ecf0f1' }}>
                    <td style={{ fontWeight: 'bold', color: '#2c3e50', padding: '10px' }}>{row.timestamp || row.time}</td>
                    
                    {sensorToggles.sht_temperature && (
                      <td style={{ color: row.sht_status === 0 ? '#e74c3c' : 'inherit', padding: '10px' }}>
                        {row.sht_status === 1 ? row.sht_temperature : '⚠️ Offline'}
                      </td>
                    )}
                    {sensorToggles.bmp_temperature && (
                      <td style={{ color: row.bmp_status === 0 ? '#e74c3c' : 'inherit', padding: '10px' }}>
                        {row.bmp_status === 1 ? row.bmp_temperature : '⚠️ Offline'}
                      </td>
                    )}
                    {sensorToggles.scd_temperature && (
                      <td style={{ color: row.scd_status === 0 ? '#e74c3c' : 'inherit', padding: '10px' }}>
                        {row.scd_status === 1 ? row.scd_temperature : '⚠️ Offline'}
                      </td>
                    )}
                    {sensorToggles.sht_humidity && (
                      <td style={{ color: row.sht_status === 0 ? '#e74c3c' : 'inherit', padding: '10px' }}>
                        {row.sht_status === 1 ? row.sht_humidity : '⚠️ Offline'}
                      </td>
                    )}
                    {sensorToggles.scd_humidity && (
                      <td style={{ color: row.scd_status === 0 ? '#e74c3c' : 'inherit', padding: '10px' }}>
                        {row.scd_status === 1 ? row.scd_humidity : '⚠️ Offline'}
                      </td>
                    )}
                    {sensorToggles.scd_co2 && (
                      <td style={{ color: row.scd_status === 0 ? '#e74c3c' : (row.scd_co2 > 1000 ? '#e74c3c' : 'inherit'), padding: '10px' }}>
                        {row.scd_status === 1 ? row.scd_co2 : '⚠️ Offline'}
                      </td>
                    )}
                    {sensorToggles.mq137_ammonia && (
                      <td style={{ color: row.mq_status === 0 ? '#e74c3c' : (row.mq137_ammonia > 20 ? '#e74c3c' : 'inherit'), padding: '10px' }}>
                        {row.mq_status === 1 ? row.mq137_ammonia : '⚠️ Offline'}
                      </td>
                    )}
                    {sensorToggles.bmp_pressure && (
                      <td style={{ color: row.bmp_status === 0 ? '#e74c3c' : 'inherit', padding: '10px' }}>
                        {row.bmp_status === 1 ? row.bmp_pressure : '⚠️ Offline'}
                      </td>
                    )}
                    {sensorToggles.fs_air_velocity && (
                      <td style={{ color: row.fs_status === 0 ? '#e74c3c' : 'inherit', padding: '10px' }}>
                        {row.fs_status === 1 ? row.fs_air_velocity : '⚠️ Offline'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <p>Select a time range and click fetch data to see history data.</p>
        </div>
      )}
    </div>
  );
}

export default HistoryExplorer;