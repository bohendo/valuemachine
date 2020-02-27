/* global process */
import fs from "fs";

import * as filers from "./filers";
import { mappings, Forms } from "./mappings";
import { InputData } from "./types";
import { emptyForm, Logger, mergeForms, translate } from "./utils";
import { getFinancialEvents } from "./events";
import { getCapitalGains } from "./getCapitalGains";

const logAndExit = (msg: any): void => {
  console.error(msg);
  process.exit(1);
};
process.on("uncaughtException", logAndExit);
process.on("unhandledRejection", logAndExit);
process.on("SIGINT", logAndExit);

(async (): Promise<void> => {
  const inputFile = `${process.cwd()}/${process.argv[2]}`;
  const outputFolder = `${process.cwd()}/${process.argv[3]}/data`;

  const input = JSON.parse(fs.readFileSync(inputFile, { encoding: "utf8" })) as InputData;
  let output = {} as Forms;

  const log = new Logger("Entry", input.logLevel);
  log.info(`\nLets go\n`);

  ////////////////////////////////////////
  // Step 1: Fetch & parse financial history

  const financialEvents = await getFinancialEvents(input);

  // Dump a copy of events to disk to review manually if needed
  fs.writeFileSync(`${outputFolder}/events.json`, JSON.stringify(financialEvents, null, 2));

  log.info(`Done gathering financial events.\n`);

  const financialData = {
    expenses: financialEvents.filter(e => e.category === "expense"),
    income: financialEvents.filter(e => e.category === "income"),
    input,
    trades: await getCapitalGains(input, financialEvents),
  };

  log.info(`Done compiling financial events.\n`);

  ////////////////////////////////////////
  // Step 2: Start out w empty forms containing raw user supplied data

  for (const form of input.forms) {
    if (!mappings[form]) {
      throw new Error(`Form ${form} not supported: No mappings available`);
    }
    output[form] = [mergeForms(emptyForm(mappings[form]), input[form])];
  }

  ////////////////////////////////////////
  // Step 3: Parse financial data to fill in the rest of the forms

  if (process.env.MODE !== "test") {
    for (const form of input.forms.reverse()) {
      if (!filers[form]) {
        log.warn(`No filer is available for form ${form}. Using unmodified user input.`);
        continue;
      }
      output = filers[form](financialData, output);
    }
  }

  ////////////////////////////////////////
  // Step 4: Save form data to disk

  log.info(`Done generating form data, exporting...\n`);
  for (const [name, data] of Object.entries(output)) {
    if (!(data as any).length || (data as any).length === 1) {
      const outputData =
        JSON.stringify(translate(data[0], mappings[name], input.logLevel), null, 2);
      fs.writeFileSync(`${outputFolder}/${name}.json`, outputData);
    } else {
      let i = 1;
      for (const page of (data as any)) {
        const pageName = `f8949_${i}`;
        const outputData = JSON.stringify(translate(page, mappings[name], input.logLevel), null, 2);
        fs.writeFileSync(`${outputFolder}/${pageName}.json`, outputData);
        i += 1;
      }
    }
  }
})();
