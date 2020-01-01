const path = require('path');
const { math, emptyForm, mergeForms } = require('../utils');

const parseF1040sd = (input, output) => {
  const mappings = require(`../mappings/${path.basename(__filename, '.js')}.json`)
  const f1040sd = mergeForms(mergeForms(emptyForm(mappings), input.f1040sd), output.f1040sd);

  return [f1040sd]
}

module.exports = { parseF1040sd }
