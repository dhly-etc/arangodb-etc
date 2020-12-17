DROP TABLE IF EXISTS "device_info";
CREATE TABLE "device_info"(
    device_id     TEXT,
    api_version   TEXT,
    manufacturer  TEXT,
    model         TEXT,
    os_name       TEXT
);

DROP TABLE IF EXISTS "readings";
CREATE TABLE "readings"(
    time  TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    device_id  TEXT,
    battery_level  DOUBLE PRECISION,
    battery_status  TEXT,
    battery_temperature  DOUBLE PRECISION,
    bssid  TEXT,
    cpu_avg_1min  DOUBLE PRECISION,
    cpu_avg_5min  DOUBLE PRECISION,
    cpu_avg_15min  DOUBLE PRECISION,
    mem_free  DOUBLE PRECISION,
    mem_used  DOUBLE PRECISION,
    rssi  DOUBLE PRECISION,
    ssid  TEXT
);
CREATE INDEX ON "readings"(time DESC);
CREATE INDEX ON "readings"(device_id, time DESC);
-- 86400000000 is in usecs and is equal to 1 day
SELECT create_hypertable('readings', 'time', chunk_time_interval => 86400000000);

--COPY device_info(device_id,api_version,manufacturer,model,os_name)
--  FROM '/tmp/sensors.csv' DELIMITER ',' CSV HEADER;  
    
