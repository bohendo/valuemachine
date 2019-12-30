const year = require('../package.json').year

const f1040s1Mappings = require('./mappings/f1040s1.json');
const { add, eq, gt, lt, mul, round, sub } = require('./math');
const { emptyForm, mergeForms } = require('./utils');

const debugMode = false;

const parseF1040s1 = (personal) => {
  const f1040s1 = mergeForms(emptyForm(f1040s1Mappings), personal.f1040s1 || {});

  return [f1040s1]
}

module.exports = { parseF1040s1 }
