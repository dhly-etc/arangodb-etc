const runMiniBenchmarks = ( docSize, numQueries ) => {
  const internal = require('internal');
  const limits = [ 10, 100, 1000 ];
  const db = internal.db;

  db._drop( "tester" );
  const collection = db._create( "tester" );
  collection.ensureIndex( {
    type: 'geo',
    fields: [ 'lat', 'lng' ],
  } );

  let start = internal.time();
  let a = Math.sqrt(docSize);
  let xv = 360.0 / a;
  let yv = 180.0 / a;
  internal.print("Using xv ", xv, " and yv ", yv);
  for (let x = -180; x < 180; x += xv) {
    for (let y = -90; y < 90; y += yv) {
      collection.save({lat: y, lng:x});
    }
  }
  internal.print("Import: ", (internal.time() - start), " s");

  limits.forEach(limit => {
    start = internal.time();
    for (let i = 0; i < numQueries; i++) {

      let lat = Math.random() * 180 - 90;
      let lng = Math.random() * 360 - 180;
      const queryText = `FOR doc IN NEAR(tester, ${lat}, ${lng}, ${limit})
                            RETURN doc`;
      db._query(queryText, {}, {optimizer:{rules:["-all"]}});
    }
    internal.print("NEAR ", limit, ": ", (internal.time() - start), " s");
  });
};
