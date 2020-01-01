const f1040scMappings = require('../mappings/f1040sc.json');
const { add, eq, gt, lt, mul, round, sub, emptyForm, mergeForms } = require('../utils');

const debugMode = false;

const parseF1040sc = (personal) => {
  const f1040sc = mergeForms(emptyForm(f1040scMappings), personal.f1040sc || {});

  return [f1040sc]
}

module.exports = { parseF1040sc }
