const csv = require('csv-parse/lib/sync');
const fs = require('fs');

const year = require('../package.json').year
const { add, mul, diff } = require("./math");
const { parseHistory } = require("./parse-history.js");

const { parseF8949 } = require("./f8949");

const personalData = require(`${process.cwd()}/${process.argv[2]}`)
const outputFolder = `${process.cwd()}/${process.argv[3]}`

console.log('Lets go');

const txHistory = parseHistory(personalData)
const f8949 = parseF8949(personalData, txHistory);

const writeOutput = (forms) => {
  for (const [name, data] of Object.entries(forms)) {
    fs.writeFileSync(`${outputFolder}/${name}.json`, JSON.stringify(data,null,2))
  }
}

writeOutput({ f8949 })
