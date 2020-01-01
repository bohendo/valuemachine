const fs = require('fs');

const test = require('../test.json');

const forms = [ 
  "f1040",
  "f1040s1",
  "f1040s2",
  "f1040s3",
  "f1040sse",
  "f1040sc",
  "f1040sd",
  "f8949"
];

for (const form of forms) {
  const mappings = require(`../src/mappings/${form}.json`);
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
