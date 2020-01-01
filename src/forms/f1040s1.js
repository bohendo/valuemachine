const path = require('path');
const { math, emptyForm, mergeForms } = require('../utils');

const parseF1040s1 = (input, output) => {
  const mappings = require(`../mappings/${path.basename(__filename, '.js')}.json`)
  const f1040s1 = mergeForms(mergeForms(emptyForm(mappings), input.f1040s1), output.f1040s1);

  return [f1040s1]
}

module.exports = { parseF1040s1 }
