const f1040sseMappings = require('../mappings/f1040sse.json');
const { add, eq, gt, lt, mul, round, sub, emptyForm, mergeForms } = require('../utils');

const debugMode = false;

const parseF1040sse = (personal) => {
  const f1040sse = mergeForms(emptyForm(f1040sseMappings), personal.f1040sse || {});

  return [f1040sse]
}

module.exports = { parseF1040sse }
