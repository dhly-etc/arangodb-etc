const test = () => {
  const q = `
    WITH restaurants, sensors, brands
    FOR v,e,p IN 1..3 OUTBOUND "brands/f1480b62c3a12bc406f83c2e528336b80050c6b2" has_branch, has_sensor
      PRUNE e.ignoreThisBranch == true
      FILTER IS_SAME_COLLECTION("sensors", v._id)
      RETURN { _key: v._key, model: v.model, manufacturer: v.manufacturer }
  `;
  db._query(q).toArray();
}
