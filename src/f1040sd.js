const year = require('../package.json').year

const f1040sdMappings = require('./mappings/f1040sd.json');
const { add, eq, gt, lt, mul, round, sub } = require('./math');
const { emptyForm, mergeForms } = require('./utils');

const debugMode = false;

const parseF1040sd = (personal) => {
  const f1040sd = mergeForms(emptyForm(f1040sdMappings), personal.f1040sd || {});

  return [f1040sd]
}

module.exports = { parseF1040sd }
