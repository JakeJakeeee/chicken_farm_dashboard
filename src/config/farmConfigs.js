// src/config/farmConfigs.js

export const HOUSE_CONFIGS = {
  house1: {
    id: 'house1',
    name: 'House 1 - Broilers',
    mqttTopic: 'yeaw_fyp_farm/node1/telemetry',
    isLive: true
  },
  house2: {
    id: 'house2',
    name: 'House 2 - Layers',
    mqttTopic: 'yeaw_fyp_farm/node2/telemetry',
    isLive: false,
    // All sensor values null and status flags 0 (Inactive)
    latestData: {
      timestamp: 'Inactive (Hardware Not Connected)',
      timestamp_ms: 0,
      boot_ms: 0,
      sht_temperature: null,
      sht_humidity: null,
      sht_status: 0,
      bmp_temperature: null,
      bmp_pressure: null,
      bmp_status: 0,
      fs_airflow: null,
      fs_status: 0,
      mq137_ammonia: null,
      mq_status: 0,
      scd_co2: null,
      scd_temperature: null,
      scd_humidity: null,
      scd_status: 0
    },
    dataHistory: []
  }
};