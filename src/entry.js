const csv = require('csv-parse/lib/sync');
const fs = require('fs');

const year = require('../package.json').year
const { add, mul, diff } = require("./math");
const { parseHistory } = require("./parse-history.js");

const resetForm = (form) => {
  const emptyForm = JSON.parse(JSON.stringify(form))
  for (const key of Object.keys(emptyForm)) {
    emptyForm[key] = "";
  }
  return emptyForm;
}

const f8949 = resetForm(require('./mappings/f8949.json'));


const personalData = `${process.cwd()}/${process.argv[2]}`
const outputFolder = `${process.cwd()}/${process.argv[3]}`

console.log('Lets go');

f8949.FullNamePage1 = "Robert Henderson"

// console.log('f8949 fields:', Object.keys(f8949));

const txHistory = parseHistory(require(personalData))

const writeOutput = (forms) => {
  for (const [name, data] of Object.entries(forms)) {
    fs.writeFileSync(`${outputFolder}/${name}.json`, JSON.stringify(data,null,2))
  }
}

writeOutput({ f8949 })

// console.log('All Tx History:', ${txHistory});
