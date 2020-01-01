const csv = require('csv-parse/lib/sync');
const fs = require('fs');

const parsers = require("./forms");

const input = require(`${process.cwd()}/${process.argv[2]}`)
const outputFolder = `${process.cwd()}/${process.argv[3]}`

console.log('Lets go');

// Generate output form data from input
const output = {};
for (const form of input.forms) {
  if (!parsers[form]) {
    throw new Error(`Form not supported: ${form}`);
  }
  output[form] = parsers[form](input, output);
}

// Write output to a series of JSON files
for (const [name, data] of Object.entries(output)) {
  if (data.length === 1) {
    console.log(`Writing form data to ${name}`);
    fs.writeFileSync(`${outputFolder}/${name}.json`, JSON.stringify(data[0], null, 2));
  } else {
    let i = 1
    for (const page of data) {
      const pageName = `f8949_${i}`;
      console.log(`Writing form data to ${pageName}`);
      fs.writeFileSync(`${outputFolder}/${pageName}.json`, JSON.stringify(page, null, 2));
      i += 1;
    }
  }
}
