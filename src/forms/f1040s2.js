const f1040s2Mappings = require('../mappings/f1040s2.json');
const { add, eq, gt, lt, mul, round, sub, emptyForm, mergeForms } = require('../utils');

const debugMode = false;

const parseF1040s2 = (personal) => {
  const f1040s2 = mergeForms(emptyForm(f1040s2Mappings), personal.f1040s2 || {});

  return [f1040s2]
}

module.exports = { parseF1040s2 }
