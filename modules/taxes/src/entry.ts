import fs from "fs";

import {
  getAddressBook,
  getChainData,
  getEvents,
  getState,
  getValueMachine,
  LevelLogger,
  ContextLogger,
} from "@finances/core";

import * as cache from "./cache";
import { env, setEnv } from "./env";
import * as filers from "./filers";
import { mappings, Forms } from "./mappings";
import { InputData } from "./types";
import { add, emptyForm, mergeForms, round, translate } from "./utils";

const logAndExit = (msg: any): void => {
  console.error(msg);
  process.exit(1);
};
process.on("uncaughtException", logAndExit);
process.on("unhandledRejection", logAndExit);
process.on("SIGINT", logAndExit);

(async (): Promise<void> => {
  const inputFile = `${process.cwd()}/${process.argv[2]}`;

  const input = JSON.parse(fs.readFileSync(inputFile, { encoding: "utf8" })) as InputData;
  const username = input.env.username;
  const logger = new LevelLogger(input.env.logLevel);
  const log = new ContextLogger("Taxes", logger);
  log.info(`Generating tax return data for ${username} (log level: ${input.env.logLevel})`);

  const outputFolder = `${process.cwd()}/build/${username}/data`;

  let output = {} as Forms;

  setEnv({ ...input.env, outputFolder });
  log.info(`Starting app in env: ${JSON.stringify(env)}`);

  ////////////////////////////////////////
  // Step 1: Fetch & parse financial history

  const addressBook = getAddressBook(input.addressBook, logger);

  const chainData = await getChainData(
    addressBook.addresses.filter(addressBook.isSelf),
    addressBook.addresses.filter(addressBook.isToken),
    cache,
    input.env.etherscanKey,
    logger,
  );

  const events = await getEvents(
    addressBook,
    chainData,
    cache,
    input.events,
    logger,
  );

  const valueMachine = getValueMachine(addressBook, logger);

  let state = cache.loadState();
  let vmLogs = cache.loadLogs();
  for (const event of events.filter(
    event => new Date(event.date).getTime() > new Date(state.lastUpdated).getTime(),
  )) {
    const [newState, newLogs] = valueMachine(state, event);
    vmLogs = vmLogs.concat(...newLogs);
    state = newState;
    // if (parseInt(event.date.split("-")[0], 10) < parseInt(env.taxYear, 10)) {
    cache.saveState(state);
    cache.saveLogs(vmLogs);
    // }
  }

  const finalState = getState(addressBook, state, logger);

  log.info(`Final state: ${JSON.stringify(finalState.getAllBalances(), null, 2)}`);
  log.info(`\nNet Worth: ${JSON.stringify(finalState.getNetWorth(), null, 2)}`);

  log.info(`Done compiling financial events.\n`);

  ////////////////////////////////////////
  // Step 2: Start out w empty forms containing raw user supplied data

  for (const form of input.forms) {
    if (!mappings[form]) {
      throw new Error(`Form ${form} not supported: No mappings available`);
    }
    if (input.formData[form] && input.formData[form].length) {
      if (!output[form]) {
        output[form] = [];
      }
      input.formData[form].forEach(page => {
        log.debug(`Adding info for page of form ${form}: ${JSON.stringify(page)}`);
        output[form].push(mergeForms(emptyForm(mappings[form]), page));
      });
    } else {
      output[form] = mergeForms(emptyForm(mappings[form]), input.formData[form]);
    }
  }

  ////////////////////////////////////////
  // Step 3: Fill out a few simple fields from user input

  if (input.dividends && input.dividends.length > 0) {
    const total = { qualified: "0", ordinary: "0" };
    input.dividends.forEach(dividend => {
      if (dividend.assetType !== "USD") {
        return;
      }
      const isQualified = dividend.tags.includes("qualified");
      log.info(`Adding ${isQualified ? "qualified " : ""} dividend of ${dividend.quantity} ${dividend.assetType} from ${dividend.source}`);
      total.ordinary = add([total.ordinary, dividend.quantity]);
      if (isQualified) {
        total.qualified = add([total.qualified, dividend.quantity]);
      }
    });
    output.f1040.L3a = round(total.qualified);
    output.f1040.L3b = round(total.ordinary);
  }

  ////////////////////////////////////////
  // Step 4: calculate data for the rest of the forms from financial data

  if (env.mode !== "test") {
    for (const form of input.forms.reverse()) {
      if (!filers[form]) {
        log.warn(`No filer is available for form ${form}. Using unmodified user input.`);
        continue;
      }
      output = filers[form](vmLogs.filter(vmLog => vmLog.date.startsWith(env.taxYear)), output);
    }
  }

  ////////////////////////////////////////
  // Step 5: Save form data to disk

  for (const [name, data] of Object.entries(output)) {
    if (!(data as any).length || (data as any).length === 1) {
      const filename = `${outputFolder}/${name}.json`;
      log.info(`Saving ${name} data to ${filename}`);
      const outputData =
        JSON.stringify(translate(data, mappings[name]), null, 2);
      fs.writeFileSync(filename, outputData);
    } else {
      let i = 1;
      for (const page of (data as any)) {
        const pageName = `f8949_${i}`;
        const fileName = `${outputFolder}/${pageName}.json`;
        log.info(`Saving page ${i} of ${name} data to ${fileName}`);
        const outputData = JSON.stringify(translate(page, mappings[name]), null, 2);
        fs.writeFileSync(fileName, outputData);
        i += 1;
      }
    }
  }
})();
