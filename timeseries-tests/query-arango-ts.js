const test = () => {
  const q = `
    WITH restaurants, sensors, brands
    LET sensors = (
      FOR v,e,p IN 1..3 OUTBOUND "brands/f1480b62c3a12bc406f83c2e528336b80050c6b2" has_branch, has_sensor
        PRUNE e.ignoreThisBranch == true
        FILTER IS_SAME_COLLECTION("sensors", v._id)
        RETURN { _key: v._key, model: v.model, manufacturer: v.manufacturer }
    )
    FOR sensor IN sensors FOR sd IN sensor_data_ts
      FILTER sensor._key == sd.device_id
      COLLECT fivem = DATE_ISO8601(FLOOR(DATE_TIMESTAMP(sd.time) / 1000 / 60 / 5) * 1000 * 60 * 5), model = sensor.model, manufacturer = sensor.manufacturer
      AGGREGATE avgTemp = AVG(sd.battery_temperature), maxTemp = MAX(sd.battery_temperature), count = COUNT(1)
      SORT avgTemp DESC
      RETURN { fivem, model, manufacturer, avgTemp }
  `;
  const start = Date.now();
  db._query(q).toArray();
  require('internal').print((Date.now() - start) / 1000);
}
