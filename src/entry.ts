import csv from 'csv-parse/lib/sync';
import fs from 'fs';

import * as parsers from "./forms";

const inputFile = `${process.cwd()}/${process.argv[2]}`;
const outputFolder = `${process.cwd()}/${process.argv[3]}`

console.log('Lets go');

const input = JSON.parse(fs.readFileSync(inputFile, { encoding: 'utf8' })) as any;

// Generate output form data from input
const output = {} as any;
for (const form of input.forms) {
  if (!parsers[form]) {
    throw new Error(`Form not supported: ${form}`);
  }
  output[form] = parsers[form](input, output) as any;
}

// Write output to a series of JSON files
for (const [name, data] of Object.entries(output)) {
  if ((data as any).length === 1) {
    console.log(`Writing form data to ${name}`);
    delete data[0].default
    fs.writeFileSync(`${outputFolder}/${name}.json`, JSON.stringify(data[0], null, 2));
  } else {
    let i = 1
    for (const page of data as any) {
      const pageName = `f8949_${i}`;
      console.log(`Writing form data to ${pageName}`);
      delete page.default
      fs.writeFileSync(`${outputFolder}/${pageName}.json`, JSON.stringify(page, null, 2));
      i += 1;
    }
  }
}
