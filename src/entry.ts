import csv from 'csv-parse/lib/sync';
import fs from 'fs';

import * as parsers from "./forms";
import { translate } from "./utils";
import { InputData } from "./types";

const inputFile = `${process.cwd()}/${process.argv[2]}`;
const outputFolder = `${process.cwd()}/${process.argv[3]}/data`

console.log('Lets go');

const input = JSON.parse(fs.readFileSync(inputFile, { encoding: 'utf8' })) as InputData;

// Generate output form data from input
const output = {} as any;
for (const form of input.forms.reverse()) {
  console.log();
  console.log(`========================================`);
  console.log(`Building form ${form}`);
  if (!parsers[form]) {
    throw new Error(`Form not supported: ${form}`);
  }
  output[form] = parsers[form](input, output) as any;
}

console.log();
console.log(`Done generating form data!`);
console.log(`Writing output to files in ${outputFolder}`);

// Write output to a series of JSON files
for (const [name, data] of Object.entries(output)) {
  console.log(`Exporting form data for ${name}`);
  if ((data as any).length === 1) {
    const outputData = JSON.stringify(translate(data[0]), null, 2)
    fs.writeFileSync(`${outputFolder}/${name}.json`, outputData);
  } else {
    let i = 1
    for (const page of data as any) {
      const pageName = `f8949_${i}`;
      const outputData = JSON.stringify(translate(page), null, 2)
      fs.writeFileSync(`${outputFolder}/${pageName}.json`, outputData);
      i += 1;
    }
  }
}
