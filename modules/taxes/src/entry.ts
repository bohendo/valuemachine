import fs from "fs";

import {
  getAddressBook,
  getChainData,
  getPrices,
  getState,
  getTransactions,
  getValueMachine,
} from "@finances/core";
import { ExpenseEvent, EventTypes, StoreKeys } from "@finances/types";
import { math } from "@finances/utils";

import { store } from "./store";
import { env, setEnv } from "./env";
import * as filers from "./filers";
import { mappings, Forms } from "./mappings";
import { ProfileData } from "./types";
import { emptyForm, logger, mergeForms, translate } from "./utils";

// Order of this list is important, it should follow the dependency graph.
// ie: first no dependents, last no dependencies
const supportedForms = [
  "f2210",
  "f1040",
  "f1040s1",
  "f1040s2",
  "f1040s3",
  "f2555",
  "f1040sse",
  "f1040sc",
  "f1040sd",
  "f8949",
  "f8889",
];

const logAndExit = (msg: any, extra?: any): void => {
  console.error(`Fatal: ${msg}`);
  extra && console.error(extra);
  process.exit(1);
};
process.on("uncaughtException", logAndExit);
process.on("unhandledRejection", logAndExit);
process.on("SIGINT", logAndExit);

(async (): Promise<void> => {
  const inputFile = `${process.cwd()}/${process.argv[2]}`;
  const basename = process.argv[2].replace(".json", "");

  const input = JSON.parse(fs.readFileSync(inputFile, { encoding: "utf8" })) as ProfileData;
  const outputFolder = `${process.cwd()}/build/${basename}/data`;
  setEnv({ ...input.env, outputFolder });

  const log = logger.child({ module: "Taxes" });
  const taxYear = input.env.taxYear;
  log.info(`Generating ${taxYear} ${basename} tax return`);

  let output = {} as Forms;

  log.debug(`Starting app in env: ${JSON.stringify(env)}`);

  const formsToFile = supportedForms.filter(form => Object.keys(input.forms).includes(form));

  ////////////////////////////////////////
  // Step 1: Fetch & parse financial history

  const addressBook = getAddressBook(input.addressBook, log);
  const prices = getPrices({ store, logger: log });

  const chainData = await getChainData({
    etherscanKey: input.env.etherscanKey,
    logger: log,
    store,
  });

  if (env.mode !== "test") {
    await chainData.syncTokenData(addressBook.addresses.filter(addressBook.isToken));
    log.info(`Syncing chain data..`);
    try {
      await chainData.syncAddresses(addressBook.addresses.filter(addressBook.isSelf));
      log.info(`Success!`);
    } catch (e) {
      log.error(`Failure! ${e.stack}`);
      process.exit(1);
    }
  }

  const transactions = getTransactions({ addressBook, store, logger: log });

  await transactions.mergeChainData(
    chainData.getAddressHistory(...addressBook.addresses.filter(addressBook.isSelf))
  );

  for (const source of input.transactions || []) {
    if (typeof source === "string" && source.endsWith(".csv")) {
      if (source.toLowerCase().includes("coinbase")) {
        await transactions.mergeCoinbase(fs.readFileSync(source, "utf8"));
      } else if (source.toLowerCase().includes("digital-ocean")) {
        await transactions.mergeDigitalOcean(fs.readFileSync(source, "utf8"));
      } else if (source.toLowerCase().includes("wyre")) {
        await transactions.mergeWyre(fs.readFileSync(source, "utf8"));
      } else if (source.toLowerCase().includes("wazirx")) {
        await transactions.mergeWazirx(fs.readFileSync(source, "utf8"));
      } else {
        throw new Error(`I don't know how to parse transactions from ${source}`);
      }
    } else if (typeof source !== "string") {
      await transactions.mergeTransactions([source]);
    }
  }

  const valueMachine = getValueMachine({ addressBook, prices, logger: log });
  let stateJson = store.load(StoreKeys.State);
  let vmEvents = store.load(StoreKeys.Events);
  let start = Date.now();
  for (const transaction of transactions.json.filter(
    transaction => new Date(transaction.date).getTime() > new Date(stateJson.lastUpdated).getTime(),
  )) {
    const [newState, newEvents] = valueMachine(stateJson, transaction);
    vmEvents = vmEvents.concat(...newEvents);
    stateJson = newState;
    const chunk = 100;
    if (transaction.index % chunk === 0) {
      const diff = (Date.now() - start).toString();
      log.info(`Processed transactions ${transaction.index - chunk}-${
        transaction.index
      } in ${diff} ms`);
      start = Date.now();
    }
  }
  store.save(StoreKeys.State, stateJson);
  store.save(StoreKeys.Events, vmEvents);

  const finalState = getState({ stateJson, addressBook, prices, logger: log });

  log.debug(`Final state: ${JSON.stringify(finalState.getAllBalances(), null, 2)}`);
  log.info(`\nNet Worth: ${JSON.stringify(finalState.getNetWorth(), null, 2)}`);
  log.info(`\nAccount balances: ${JSON.stringify(finalState.getAllBalances(), null, 2)}`);

  log.info(`Done compiling financial events.\n`);

  ////////////////////////////////////////
  // Step 2: Start out w empty forms containing raw user supplied data

  for (const form of formsToFile) {
    if (!mappings[form]) {
      throw new Error(`Form ${form} not supported: No mappings available`);
    }
    // TODO: simplify multi-page detection
    if (input.forms[form] && typeof input.forms[form].length === "number") {
      if (!output[form]) {
        output[form] = [];
      }
      input.forms[form].forEach(page => {
        log.debug(`Adding info for page of form ${form}: ${JSON.stringify(page)}`);
        output[form].push(mergeForms(emptyForm(mappings[form]), page));
      });
    } else {
      output[form] = mergeForms(emptyForm(mappings[form]), input.forms[form]);
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
      log.info(`Adding ${isQualified ? "qualified " : ""}dividend of ${dividend.quantity} ${
        dividend.assetType
      } from ${dividend.source}`);
      total.ordinary = math.add(total.ordinary, dividend.quantity);
      if (isQualified) {
        total.qualified = math.add(total.qualified, dividend.quantity);
      }
    });
    output.f1040.L3a = math.round(total.qualified);
    output.f1040.L3b = math.round(total.ordinary);
  }

  if (input.expenses && input.expenses.length > 0) {
    input.expenses.forEach(expense => {
      vmEvents.push({
        assetType: "USD",
        assetPrice: "1",
        to: "merchant",
        taxTags: [],
        type: EventTypes.Expense,
        ...expense,
      } as ExpenseEvent);
      vmEvents.sort((a, b): number => new Date(a.date).getTime() - new Date(b.date).getTime());
    });
  }

  ////////////////////////////////////////
  // Step 4: calculate data for the rest of the forms from financial data

  if (env.mode !== "test") {
    for (const form of formsToFile.reverse()) {
      // eslint-disable-next-line import/namespace
      if (!filers[form]) {
        log.warn(`No filer is available for form ${form}. Using unmodified user input.`);
        continue;
      }
      // eslint-disable-next-line import/namespace
      output = filers[form](
        vmEvents.filter(vmEvent => vmEvent.date.startsWith(taxYear)),
        output,
      );
    }
  }

  ////////////////////////////////////////
  // Step 5: Save form data to disk

  // Ordered according to "Attachment Sequence No." in top right of each form
  const attachmentSequence = [
    "f1040",
    "f1040s1", // 1
    "f1040s2", // 2
    "f1040s3", // 3
    "f2210", // 6
    "f1040sc", // 9
    "f1040sd", // 12
    "f8949", // 12a
    "f1040sse", // 17
    "f2555", // 34
    "f8889", // 52
  ];

  if (attachmentSequence.some(form => !supportedForms.includes(form))) {
    throw new Error(`Some supported form doesn't have an attachment sequence number yet`);
  }

  let page = 1;
  attachmentSequence.forEach(name => {
    const data = output[name];
    if (!data) {
      return;
    } else if (!(data as any).length) {
      const filename = `${outputFolder}/${page++}_${name}.json`;
      log.info(`Saving ${name} data to ${filename}`);
      const outputData =
        JSON.stringify(translate(data, mappings[name]), null, 2);
      fs.writeFileSync(filename, outputData);
    } else {
      for (const formPage of (data as any)) {
        const pageName = `${page++}_f8949`;
        const fileName = `${outputFolder}/${pageName}.json`;
        log.info(`Saving a page of ${name} data to ${fileName}`);
        const outputData = JSON.stringify(translate(formPage, mappings[name]), null, 2);
        fs.writeFileSync(fileName, outputData);
      }
    }
  });

})();
