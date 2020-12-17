'use strict';

const internal = require('internal')

const gcd = ( a, b ) => {
  if ( a < 0 ) {
    a = -a;
  }
  if ( b < 0 ) {
    b = -b;
  }
  if ( b > a ) {
    const temp = a;
    a = b;
    b = temp;
  }
  while ( a !== 0 || b !== 0 ) {
    if ( b === 0 ) {
      return a;
    }
    a %= b;
    if ( a === 0 ) {
      return b;
    }
    b %= a;
  }
};

const relativePrime = ( n ) => {
  let q = 0;
  while ( q === 0 ) {
    q = Math.random() * n;
    if ( q > 0.1 * n && gcd( n, q ) === 1 ) {
      return q;
    }
    q = 0;
  }
};

const getOPS = ( t, n ) => {
  return Math.floor( 1000 * n / t );
};

const incrementalBatchInsertSequential = ( c, l, u ) => {
  const t0 = new Date().getTime();
  for ( let i = l; i < u; i++ ) {
    c.insert( {
      _key: i.toString(),
      data: `Data string for Document ${i}.`
    }, { silent: true } );
  }
  const t1 = new Date().getTime();
  return ( t1 - t0 );
};

const incrementalBatchInsertRandom = ( c, l, u ) => {
  const q = relativePrime( u - l );
  const t0 = new Date().getTime();
  for ( let i = 0; i < ( u - l ); i++ ) {
    const j = l + ( ( i * q ) % ( u - l ) );
    c.insert( {
      _key: j.toString(),
      data: `Data string for Document ${j}.`
    }, { silent: true } );
  }
  const t1 = new Date().getTime();
  return ( t1 - t0 );
};

const batchInsertRandom = ( c, n ) => {
  const b = Math.floor( 0.9 * n );
  const t1 = incrementalBatchInsertRandom( c, 0, b );
  const t2 = incrementalBatchInsertRandom( c, b, n );
  internal.print( `Batch insertion took ${t1 + t2}ms (${getOPS( t1 + t2, n )}ops).` );
  internal.print( ` + First 90% took ${t1}ms (${getOPS( t1, b )}ops).` );
  internal.print( ` + Last 10% took ${t2}ms (${getOPS( t2, n - b )}ops).` );
};

const batchInsertSequential = ( c, n ) => {
  const b = Math.floor( 0.9 * n );
  const t1 = incrementalBatchInsertSequential( c, 0, b );
  const t2 = incrementalBatchInsertSequential( c, b, n );
  internal.print( `Batch insertion took ${t1 + t2}ms (${getOPS( t1 + t2, n )}ops).` );
  internal.print( ` + First 90% took ${t1}ms (${getOPS( t1, b )}ops).` );
  internal.print( ` + Last 10% took ${t2}ms (${getOPS( t2, n - b )}ops).` );
};

const hotsetLookup = ( c, h, n ) => {
  const t0 = new Date().getTime();
  for ( let i = 0; i < n; i++ ) {
    const j = Math.floor( Math.random() * h );
    c.document( {
      _key: j.toString()
    } );
  }
  const t1 = new Date().getTime();
  internal.print( `Hot-set lookup took ${t1 - t0}ms (${getOPS( t1 - t0, n )}ops).` );
};

const randomLookup = ( c, s, n ) => {
  const t0 = new Date().getTime();
  for ( let i = 0; i < n; i++ ) {
    const j = Math.floor( Math.random() * s );
    c.document( {
      _key: j.toString()
    } );
  }
  const t1 = new Date().getTime();
  internal.print( `Random lookup took ${t1 - t0}ms (${getOPS( t1 - t0, n )}ops).` );
};

const cleanup = ( c ) => {
  const t0 = new Date().getTime();
  c.truncate();
  const t1 = new Date().getTime();
  internal.print( `Cleanup took ${t1 - t0}ms.` );
};

const battery = ( c, s, n, l, h ) => {
  if ( s ) {
    batchInsertSequential( c, n );
  } else {
    batchInsertRandom( c, n );
  }
  randomLookup( c, n, l );
  hotsetLookup( c, h, l );
  cleanup( c );
};

const runSuite = () => {
  const db = internal.db;

  try {
    db._create( 'c10k' );
  } catch ( err ) {
    db.c10k.truncate();
  }

  try {
    db._create( 'c100k' );
  } catch ( err ) {
    db.c100k.truncate();
  }

  try {
    db._create( 'c1m' );
  } catch ( err ) {
    db.c1m.truncate();
  }

  try {
    db._create( 'c10m' );
  } catch ( err ) {
    db.c10m.truncate();
  }

  battery( db.c10k, true, 10000, 1000000, 500 );
  battery( db.c100k, true, 100000, 1000000, 5000 );
  battery( db.c1m, true, 1000000, 1000000, 50000 );
  battery( db.c10m, true, 10000000, 10000000, 50000 );
}

runSuite();
