fs = require('fs')

read = () => {
  sanitizeFile = (file) => {
    return file.split('/').slice(-1)[0].split('.').join('_');
  }
  convert = (edge) => {
    return {
      _from: sanitizeFile(edge.source),
      _to: sanitizeFile(edge.target)
    }
  };
  return fs.read('includes.dat')
    .split('\n')
    .filter(line => line.trim() !== '')
    .map(line => convert(JSON.parse(line)));
}

buildDataset = () => {
  db._drop('files');
  db._drop('includes');
  files = db._create('files');
  includes = db._createEdgeCollection('includes');

  edges = read();
  edges.map(edge => {
    try {
      sourceId = `files/${edge._from}`;
      targetId = `files/${edge._to}`
      if (!files.exists(sourceId)) {
        files.save({_key: edge._from});
      }
      if (!files.exists(targetId)) {
        files.save({_key: edge._to});
      }
      includes.save({_from: sourceId, _to: targetId});
    } catch (err) {
      print ('error while processing ' + JSON.stringify(edge));
      throw err;
    }
  });
}

getIncludeCounts = () => {
  query = `
    FOR file IN files
      LET neighbors = (
        FOR v IN 1..1000 INBOUND file includes
          OPTIONS {bfs: true, uniqueVertices: 'global'}
          RETURN v
      )
      SORT LENGTH(neighbors) DESC
      RETURN {file: file._key, count: LENGTH(neighbors)}
  `;
  return db._query(query).toArray();
}

writeResults = () => {
  fix = (file) => {
    if (file.endsWith('_h')) {
      return file.substring(0, file.length - 2) + ".h";
    } else if (file.endsWith('_hpp')) {
      return file.substring(0, file.length - 4) + ".hpp";
    }
    return file;
  }
  buildDataset();
  results = getIncludeCounts().filter(result => result.count > 0);
  sum = {file: "Sum", count: results.map(x => x.count).reduce((t, c) => t + c, 0)};
  norm = {file: "L2 Norm", count: Math.round(Math.sqrt(results.map(x => x.count).reduce((t, c) => t + (c * c), 0)))};
  lines = [sum, norm].concat(results).map(result => {
    a = fix(result.file);
    b = result.count.toString();
    c = new Array(50 - a.length - b.length + 1).join(" ");
    return a + c + b;
  });
  output = lines.join('\n');
  fs.writeFileSync('analysis.dat', output);
}
