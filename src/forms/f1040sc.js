const path = require('path');
const { math, emptyForm, mergeForms } = require('../utils');

const parseF1040sc = (input, output) => {
  const mappings = require(`../mappings/${path.basename(__filename, '.js')}.json`)
  const f1040sc = mergeForms(mergeForms(emptyForm(mappings), input.f1040sc), output.f1040sc);

  return [f1040sc]
}

module.exports = { parseF1040sc }
