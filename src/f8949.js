const f8949Mappings = require('./mappings/f8949.json');
const { emptyForm, mergeForms } = require('./utils');

const parseF8949 = (personal, txHistory) => {
  const f8949 = mergeForms(emptyForm(f8949Mappings), personal.f8949 || {});
  f8949.FullNamePage1 = "Robert Henderson";
  return f8949;
}

module.exports = { parseF8949 }
