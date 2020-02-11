import csv from 'csv-parse/lib/sync';
import fs from 'fs';

import * as filers from "./filers";
import { mappings, Forms } from "./mappings";
import { InputData } from "./types";
import { emptyForm, mergeForms, translate } from './utils';
import { getTaxableTrades } from './getTaxableTrades';
import { parseHistory } from './parseHistory';

const inputFile = `${process.cwd()}/${process.argv[2]}`;
const outputFolder = `${process.cwd()}/${process.argv[3]}/data`

const input = JSON.parse(fs.readFileSync(inputFile, { encoding: 'utf8' })) as InputData;
let output = {} as Forms;

console.log('Lets go');

////////////////////////////////////////
// Step 1: Fetch & parse financial history

const txHistory = parseHistory(input);
const financialData = {
  input,
  txHistory,
  taxableTrades: getTaxableTrades(txHistory),
}

////////////////////////////////////////
// Step 2: Start out w empty forms containing raw user supplied data

for (const form of input.forms) {
  if (!mappings[form]) {
    throw new Error(`Form ${form} not supported: No mappings available`);
  }
  output[form] = [mergeForms(emptyForm(mappings[form]), input[form])];
}

////////////////////////////////////////
// Step 3: Parse personal data & attachments to fill in the rest of the forms

if (process.env.MODE !== 'test') {
  for (const form of input.forms.reverse()) {
    console.log(`\n========================================\n= Building Form: ${form}`);
    if (!filers[form]) {
      console.warn(`No filer is available for form ${form}. Using unmodified user input.`);
      continue;
    }
    output = filers[form](financialData, output);
  }
}

////////////////////////////////////////
// Step 4: Write output to a series of JSON files

for (const [name, data] of Object.entries(output)) {
  console.log(`Exporting form data for ${name}`);
  if (!data.length || data.length === 1) {
    const outputData = JSON.stringify(translate(data[0], mappings[name]), null, 2)
    fs.writeFileSync(`${outputFolder}/${name}.json`, outputData);
  } else {
    let i = 1
    for (const page of data) {
      const pageName = `f8949_${i}`;
      const outputData = JSON.stringify(translate(page, mappings[name]), null, 2)
      fs.writeFileSync(`${outputFolder}/${pageName}.json`, outputData);
      i += 1;
    }
  }
}
