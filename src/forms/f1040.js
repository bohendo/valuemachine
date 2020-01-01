const path = require('path');
const { math, emptyForm, mergeForms } = require('../utils');

const parseF1040 = (input, output) => {
  const mappings = require(`../mappings/${path.basename(__filename, '.js')}.json`)
  const f1040 = mergeForms(mergeForms(emptyForm(mappings), input.f1040), output.f1040);

  return [f1040]
}

module.exports = { parseF1040 }
