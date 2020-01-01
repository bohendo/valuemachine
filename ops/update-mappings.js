const fs = require('fs');
const test = require('../test.json');

const mappingsFile = (form) => `./src/mappings/${form}.json`;
const fieldsFile = (form) => `./ops/fields/${form}.fields`;

for (const form of test.forms) {
  const mappings = JSON.parse(fs.readFileSync(mappingsFile(form), { encoding: 'utf8' }));
  if (!mappings) {
    throw new Error(`Mappings for form ${form} do not exist!`);
  }
  const fields = fs.readFileSync(fieldsFile(form), { encoding: 'utf8' });
  if (!fields) {
    throw new Error(`Fields for form ${form} do not exist!`);
  }

  const fieldNames = fields.match(
    /^FieldName: ([\[\]a-zA-Z0-9\._]*)$/gm
  ).map(m => m.replace('FieldName: ', ''));

  for (const [key, value] of Object.entries(mappings)) {
    if (!fieldNames.includes(value)) {
      // console.log(`Field ${value} of ${form} exists in mappings but not fields, removing...`);
      delete mappings[key];
    }
  }

  for (const field of fieldNames) {
    if (!field.match(/\.f/) && !field.match(/\.c/)) { continue; }
    if (!Object.values(mappings).includes(field)) {

      const name = field
        .replace(/\[[0-9]+\]\./g, '.')
        .replace(/^topmostSubform./, '')
        .replace(/^form1./, '')
        .replace(/\[([0-9]+)\]$/, '_$1')
        .replace(/\./g, '_')
        .replace(/Page[0-9]+/g, '')
        .replace(/Line/g, 'L')
        .replace(/Item/g, 'I')
        .replace(/ReadOrderControl/, '')
        .replace(/Table/, '')
        .replace(/Preparer_+Preparer_/, 'Preparer_')
        .replace(/Dependents_+Dependents_/, 'Dependents_')
        .replace(/(_f[0-9]+_[0-9]+)_0$/, '$1')
        .replace(/^_+/, '')
        .replace(/__/, '_')

      console.log(`${field} ==> ${name}`);
      mappings[name] = field;
    }
  }

  fs.writeFileSync(mappingsFile(form), JSON.stringify(mappings, null, 2));
}

for (const form of test.forms) {
  const mappings = JSON.parse(fs.readFileSync(mappingsFile(form), { encoding: 'utf8' }));
  if (!mappings) {
    throw new Error(`Mappings for form ${form} do not exist!`);
  }

  if (!test[form]) {
    console.log(`Test values for form ${form} do not exist, adding...`);
    test[form] = {}
  }

  for (const [key, value] of Object.entries(test[form])) {
    if (!Object.keys(mappings).includes(key)) {
      console.log(`Key ${key} of ${form} is in test but not mappings, removing..`);
      delete test[form][key]
    }
  }

  for (const [key, value] of Object.entries(mappings)) {
    if (!Object.keys(test[form]).includes(key)) {
      console.log(`Key ${key} of ${form} is in mappings but in test, adding..`);
      test[form][key] = key
    }
  }
}

fs.writeFileSync(`test.json`, JSON.stringify(test, null, 2));
