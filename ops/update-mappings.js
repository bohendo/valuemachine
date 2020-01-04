const fs = require('fs');
const test = require('../test.json');

const mappingsFile = (form) => `./src/mappings/${form}.json`;
const fieldsFile = (form) => `./ops/fields/${form}.fields`;

const flag = process.argv[2];
if (!flag || (flag !== "-n" && flag !== "-y")) {
  console.log(`Pass either "-n" or "-y" as the first & only argument`);
  console.log(`  -n  Dry-run: print changes we would make if run with -y`);
  console.log(`  -y  Make & save changes`);
  process.exit();
}
const dryRun = flag !== "-y"

for (const form of test.forms) {
  const mappings = JSON.parse(fs.readFileSync(mappingsFile(form), { encoding: 'utf8' }));
  if (!mappings) {
    throw new Error(`Mappings for form ${form} do not exist!`);
  }
  const fields = fs.readFileSync(fieldsFile(form), { encoding: 'utf8' });
  if (!fields) {
    throw new Error(`Fields for form ${form} do not exist!`);
  }

  const fieldNames = fields.match(/^FieldName: (.*)$/gm).map(m => m.replace('FieldName: ', ''));

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
        .replace(/.*?\.([fc][0-9]+_[0-9].*)/, '$1')
        .replace(/\[([0-9]+)\]/, '_$1')
        .replace(/(f[0-9]+_[0-9]+)_0/, '$1')

      if (name.match(/_RO_/)) { continue; }

      console.log(`Field ${field} does not exist in mappings, adding it as: ${name}`);
      mappings[name] = field;
    }
  }

  dryRun || fs.writeFileSync(mappingsFile(form), JSON.stringify(mappings, null, 2));
}

for (const form of test.forms) {
  const mappings = JSON.parse(fs.readFileSync(mappingsFile(form), { encoding: 'utf8' }));
  if (!mappings) {
    throw new Error(`Mappings for form ${form} do not exist!`);
  }

  if (!test[form]) {
    test[form] = {}
  }

  for (const [key, value] of Object.entries(test[form])) {
    if (!Object.keys(mappings).includes(key) && typeof test[form][key] !== 'undefined') {
      console.log(`Deleting key ${key} from test for ${form}`);
      delete test[form][key]
    }
  }

  for (const [key, value] of Object.entries(mappings)) {
    if (typeof test[form][key] == 'undefined') {
      console.log(`Adding key ${key} to test for ${form}`);
      if (key.toLowerCase().startsWith('c')) {
        test[form][key] = true;
      } else {
        test[form][key] = key;
      }
    }
  }
}

dryRun || fs.writeFileSync(`test.json`, JSON.stringify(test, null, 2));
