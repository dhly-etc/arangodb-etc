SELECT
  time_bucket('5 minutes', time) as fivem,
  model,
  manufacturer,
  avg(battery_temperature) as avgTemp
FROM device_info JOIN readings
ON device_info.device_id = readings.device_id
WHERE device_info.device_id = 'demo001415'
   OR device_info.device_id = 'demo002469'
   OR device_info.device_id = 'demo001220'
   OR device_info.device_id = 'demo002451'
   OR device_info.device_id = 'demo001217'
   OR device_info.device_id = 'demo001773'
   OR device_info.device_id = 'demo000182'
   OR device_info.device_id = 'demo000116'
   OR device_info.device_id = 'demo001659'
   OR device_info.device_id = 'demo002509'
   OR device_info.device_id = 'demo000717'
   OR device_info.device_id = 'demo001987'
   OR device_info.device_id = 'demo001718'
   OR device_info.device_id = 'demo000356'
   OR device_info.device_id = 'demo002986'
   OR device_info.device_id = 'demo001085'
   OR device_info.device_id = 'demo000244'
   OR device_info.device_id = 'demo002688'
   OR device_info.device_id = 'demo000743'
   OR device_info.device_id = 'demo001014'
   OR device_info.device_id = 'demo001640'
   OR device_info.device_id = 'demo002596'
   OR device_info.device_id = 'demo002168'
   OR device_info.device_id = 'demo001163'
   OR device_info.device_id = 'demo001274'
   OR device_info.device_id = 'demo002480'
   OR device_info.device_id = 'demo001867'
   OR device_info.device_id = 'demo001064'
GROUP BY fivem, model, manufacturer
ORDER BY avgTemp DESC;
