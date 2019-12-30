const year = require('../package.json').year

const f1040Mappings = require('./mappings/f1040.json');
const { add, eq, gt, lt, mul, round, sub } = require('./math');
const { emptyForm, mergeForms } = require('./utils');

const debugMode = false;

const parseF1040 = (personal) => {
  const f1040 = mergeForms(emptyForm(f1040Mappings), personal.f1040 || {});

  return [f1040]
}

module.exports = { parseF1040 }
