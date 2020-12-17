const bulkImport = ( collection, numRows, numCols ) => {
  const deltaLat = 180.0 / ( numRows - 1 );
  const deltaLon = 360.0 / ( numCols - 1 );
  let doc = 0;
  for ( let row = 0; row < numRows; ++row ) {
    const documents = [];
    for ( let col = 0; col < numCols; ++col ) {
      documents.push( {
        _key: `doc_${doc}`,
        location: [
          -180.0 + ( deltaLon * col ),
          -90.0 + ( deltaLat * row )
        ]
      } );
      ++doc;
    }
    collection.save( documents );
  }
};

const importBench = ( gridSubdivisions ) => {
  const db = require( 'internal' ).db;
  const collectionName = 'geoCollection';

  db._drop( collectionName );
  const collection = db._create( collectionName );
  collection.ensureIndex( {
    type: 'geo',
    fields: [ 'location' ],
    geoJson: true
  } );

  const start = Date.now();
  bulkImport( collection, 181 * gridSubdivisions, 361 * gridSubdivisions );
  const end = Date.now();

  const docsTotal = ( 181 * gridSubdivisions ) * ( 361 * gridSubdivisions );

  return ( docsTotal * 1000 / ( end - start ) );
};

const nearBench = ( numQueries, resultLimit ) => {
  const db = require( 'internal' ).db;
  const collectionName = 'geoCollection';
  const gridSubdivisions = Math.ceil( Math.sqrt( numQueries / ( 181 * 361 ) ) );
  const numRows = 181 * gridSubdivisions;
  const numCols = 361 * gridSubdivisions;
  const deltaLat = 180.0 / ( numRows - 1 );
  const deltaLon = 360.0 / ( numCols - 1 );
  const queryText = `
    FOR doc IN NEAR(@@collection, @lat, @lon, @limit)
      RETURN doc
  `;
  const queryOptions = {};//{ optimizer: { rules: [ "-geo-index-optimizer" ] } };

  const executeQuery = ( centroid ) => {
    const params = {
      "@collection": collectionName,
      lat: centroid[1],
      lon: centroid[0],
      limit: resultLimit
    };
    const result = db._query( queryText, params, queryOptions );
    if ( result.count() == 0 || result.count() > resultLimit ) {
      throw new Error();
    }
    const fillRatio = result.count() / resultLimit;
    if ( fillRatio < 0.9 ) {
      require('internal').print(`Only retreived ${fillRatio} for ${params}`);
    }
  };

  let current = 0;
  const start = Date.now();
  for ( let row = 0; row < numRows; row++ ) {
    for ( let col = 0; col < numCols; col++ ) {
      const centroid = [
        -180.0 + ( deltaLon * col ),
        -90.0 + ( deltaLat * row )
      ];
      executeQuery( centroid );
      if ( ++current >= numQueries ) {
        break;
      }
    }
    if ( current >= numQueries ) {
      break;
    }
  }
  const end = Date.now();

  return ( numQueries * 1000 / ( end - start ) );
};

const withinBench = ( numQueries, resultLimit ) => {
  const db = require( 'internal' ).db;
  const collectionName = 'geoCollection';
  const gridSubdivisions = Math.ceil( Math.sqrt( numQueries / ( 181 * 361 ) ) );
  const numRows = 181 * gridSubdivisions;
  const numCols = 361 * gridSubdivisions;
  const deltaLat = 180.0 / ( numRows - 1 );
  const deltaLon = 360.0 / ( numCols - 1 );
  const distLimit = ( 157253.3733278163964429 / gridSubdivisions )
                  * Math.sqrt(resultLimit); // include at least resultLimit
                                            // grid points
  const queryText = `
    FOR doc IN WITHIN(@@collection, @lat, @lon, @radius)
      LIMIT @limit
      RETURN doc
  `;
  const queryOptions = {};//{ optimizer: { rules: [ "-geo-index-optimizer" ] } };

  const executeQuery = ( centroid ) => {
    const params = {
      "@collection": collectionName,
      lat: centroid[1],
      lon: centroid[0],
      radius: distLimit,
      limit: resultLimit
    };
    const result = db._query( queryText, params, queryOptions );
    if ( result.count() == 0 || result.count() > resultLimit ) {
      throw new Error();
    }
  };

  let current = 0;
  const start = Date.now();
  for ( let row = 0; row < numRows; row++ ) {
    for ( let col = 0; col < numCols; col++ ) {
      const centroid = [
        -180.0 + ( deltaLon * col ),
        -90.0 + ( deltaLat * row )
      ];
      executeQuery( centroid );
      if ( ++current >= numQueries ) {
        break;
      }
    }
    if ( current >= numQueries ) {
      break;
    }
  }
  const end = Date.now();

  return ( numQueries * 1000 / ( end - start ) );
};

const runImport = ( subdivisions ) => {
  const trials = 3;
  let time = 0;
  for ( let i = 0; i < trials; i++ ) {
    time += importBench( subdivisions );
  }
  return Math.round( time / trials );
};

const runNear = ( numQueries, resultLimit ) => {
  const trials = 5;
  let time = 0;
  for ( let i = 0; i < 5; i++ ) {
    time += nearBench( numQueries, resultLimit );
  }
  return Math.round( time / trials );
}

const runWithin = ( numQueries, resultLimit ) => {
  const trials = 5;
  let time = 0;
  for ( let i = 0; i < 5; i++ ) {
    time += withinBench( numQueries, resultLimit );
  }
  return Math.round( time / trials );
};

const runBenchmarks = ( targetSizes, numQueries ) => {
  const print = require( 'internal' ).print;
  const limits = [ 10, 100, 1000 ];

  for ( let i = 0; i < targetSizes.length; ++i ) {
    const targetSize = targetSizes[i];
    const subdivisions = Math.ceil( Math.sqrt( targetSize / ( 181 * 361 ) ) );
    const docCount = ( subdivisions * 181 ) * ( subdivisions * 361 );
    const trial = {
      docCount,
      numQueries,
      throughput: {
        import: runImport( subdivisions )
      }
    };
    for ( let j = 0; j < limits.length; ++j ) {
      const resultLimit = limits[j];
      trial.throughput[`near${resultLimit}`] = runNear( numQueries,
                                                        resultLimit );
      trial.throughput[`within${resultLimit}`] = runWithin( numQueries,
                                                            resultLimit );
    }
    print( trial );
  }
};
