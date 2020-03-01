/* global process */
import fs from "fs";

import { getAddressBook } from "./addressBook";
import { env, setEnv } from "./env";
import * as filers from "./filers";
import { mappings, Forms } from "./mappings";
import { InputData, State } from "./types";
import { emptyForm, Logger, mergeForms, translate } from "./utils";
import { getFinancialEvents } from "./events";
import { getValueMachine } from "./vm";

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

  const log = new Logger("Entry", input.env.logLevel);

  log.info(`Starting app in env: ${JSON.stringify(env)}`);
  setEnv(input.env);
  log.info(`Set new env: ${JSON.stringify(env)}`);

  log.info(`\nLets go\n`);

  ////////////////////////////////////////
  // Step 1: Fetch & parse financial history

  let events;

  try {
    events = JSON.parse(fs.readFileSync(`${outputFolder}/events.json`, "utf8"));
    log.info(`Loaded ${events.length} events from cache`);
  } catch (e) {
    events = await getFinancialEvents(input);
    fs.writeFileSync(`${outputFolder}/events.json`, JSON.stringify(events, null, 2));
    // Dump a copy of events to project root too just for dev convenience
    fs.writeFileSync(`./events.json`, JSON.stringify(events, null, 2));
    log.info(`Done gathering financial events.\n`);
  }

  const getNetWorth = (state: State): State => state;
  const valueMachine = getValueMachine(getAddressBook(input));

  let [state, logs] = [null, []];
  for (const event of events) {
    [state, logs] = valueMachine(state, event);
  }

  // TODO: save latest state & pick up from there when we get new events.

  console.log(`net worth: ${getNetWorth(state)}}`);

  const financialData = {
    expenses: logs.filter(log => log.type === "expense"),
    income: logs.filter(log => log.type === "income"),
    trades: logs.filter(log => log.type === "trades"),
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

  if (env.mode !== "test") {
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
        JSON.stringify(translate(data[0], mappings[name]), null, 2);
      fs.writeFileSync(`${outputFolder}/${name}.json`, outputData);
    } else {
      let i = 1;
      for (const page of (data as any)) {
        const pageName = `f8949_${i}`;
        const outputData = JSON.stringify(translate(page, mappings[name]), null, 2);
        fs.writeFileSync(`${outputFolder}/${pageName}.json`, outputData);
        i += 1;
      }
    }
  }
})();
