const path = require('path');
const { math, emptyForm, mergeForms } = require('../utils');

const parseF1040sse = (input, output) => {
  const mappings = require(`../mappings/${path.basename(__filename, '.js')}.json`)
  const f1040sse = mergeForms(mergeForms(emptyForm(mappings), input.f1040sse), output.f1040sse);

  return [f1040sse]
}

module.exports = { parseF1040sse }
