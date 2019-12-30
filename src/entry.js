const csv = require('csv-parse/lib/sync');
const fs = require('fs');

const year = require('../package.json').year
const { add, mul, diff } = require("./math");
const { parseHistory } = require("./parse-history.js");

const { parseF1040 } = require("./f1040");
const { parseF1040s1 } = require("./f1040s1");
const { parseF1040s2 } = require("./f1040s2");
const { parseF1040s3 } = require("./f1040s3");
const { parseF1040sc } = require("./f1040sc");
const { parseF1040sd } = require("./f1040sd");
const { parseF1040sse } = require("./f1040sse");
const { parseF8949 } = require("./f8949");

const personalData = require(`${process.cwd()}/${process.argv[2]}`)
const outputFolder = `${process.cwd()}/${process.argv[3]}`

console.log('Lets go');

const rawForms = {}

const txHistory = parseHistory(personalData)

rawForms.f8949 = parseF8949(personalData, txHistory);
rawForms.f1040 = parseF1040(personalData);
rawForms.f1040s1 = parseF1040s1(personalData);
rawForms.f1040s2 = parseF1040s2(personalData);
rawForms.f1040s3 = parseF1040s3(personalData);
rawForms.f1040sc = parseF1040sc(personalData);
rawForms.f1040sd = parseF1040sd(personalData);
rawForms.f1040sse = parseF1040sse(personalData);

const forms = {}
for (const [name, data] of Object.entries(rawForms)) {
  if (data.length === 1) {
    forms[name] = data[0];
  } else {
    let i = 1
    for (const page of data) {
      forms[`f8949_${i}`] = page;
      i += 1;
    }
  }
}

for (const [name, data] of Object.entries(forms)) {
  console.log(`Writing form data to ${name}`);
  fs.writeFileSync(`${outputFolder}/${name}.json`, JSON.stringify(data,null,2))
}
