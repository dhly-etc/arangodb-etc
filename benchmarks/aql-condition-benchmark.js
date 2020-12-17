const generateQuery = (degree, levels) => {
  const isEven = (n) => {
    return ((n % 2) === 0);
  };

  const generateVar = (position, clause) => {
    const letter = String.fromCharCode("a".charCodeAt(0) + position);
    return `doc.${letter}${clause}`;
  }

  const generateClause = (level, degree, index, limit) => {
    const operator = isEven(level) ? `&&` : `||`;
    let clause = `(`;
    for (let i = 0; i < degree; i++) {
      const operand = (level == (limit - 1))
          ? generateVar(i, index)
          : generateClause(level + 1, degree, (degree * index) + i, limit);
      const separator = (i == (degree - 1)) ? `` : ` ${operator} `;
      clause += (operand + separator);
    }
    clause += `)`;
    return clause;
  };

  return `FOR doc IN test
            FILTER ${generateClause(0, degree, 0, levels)}
            RETURN doc`;
};

const conditionBench = (degree, maxLevel, memoryLimit = 10000000000) => {
  const internal = require('internal');
  const db = internal.db;
  const print = internal.print;

  db._drop("test");
  db._create("test");

  const singleRun = (query, memoryLimit) => {
    const start = Date.now();
    const res = db._query(query, {}, { memoryLimit });
    const end = Date.now();
    return (end - start);
  };

  const timeQuery = (query, memoryLimit) => {
    const reps = 5;
    let total = 0;
    for (let i = 0; i < reps; i++) {
      total += singleRun(query, memoryLimit);
    }
    return (total / reps);
  };

  for (var levels = 1; levels <= maxLevel; levels++) {
    const query = generateQuery(degree, levels);
    const time = timeQuery(query, memoryLimit);
    print (`d = ${degree}, l = ${levels}; ${time}ms`);
  }
};


conditionBench(2, 7);
conditionBench(3, 5);
conditionBench(4, 3);
conditionBench(5, 3);
conditionBench(6, 3);
conditionBench(7, 2);
