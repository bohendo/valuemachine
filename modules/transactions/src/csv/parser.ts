import { Logger, TransactionsJson } from "@valuemachine/types";
import { getLogger, getTransactionsError } from "@valuemachine/utils";

import { coinbaseParser, coinbaseHeaders } from "./apps/coinbase";
import { digitaloceanParser, digitaloceanHeaders } from "./apps/digitalocean";
import { elementsParser, elementsHeaders } from "./apps/elements";
import { wyreParser, wyreHeaders } from "./apps/wyre";
import { wazirxParser, wazirxHeaders } from "./apps/wazirx";

export const parseCsv = (csvData: string, logger: Logger): TransactionsJson => {
  const log = logger || getLogger();

  let txns;
  const csvRows = csvData.split(/\r?\n/);
  while (csvRows.length) {
    if (csvRows[0] === coinbaseHeaders) {
      log.info(`Parsing csv as ${csvRows.length - 1} rows of coinbase data`);
      txns = coinbaseParser(csvRows.join(`\n`), log);
      break;
    } else if (csvRows[0] === digitaloceanHeaders) {
      log.info(`Parsing csv as ${csvRows.length - 1} rows of digital ocean data`);
      txns = digitaloceanParser(csvRows.join(`\n`), log);
      break;
    } else if (csvRows[0] === elementsHeaders) {
      log.info(`Parsing csv as ${csvRows.length - 1} rows of elements data`);
      txns = elementsParser(csvRows.join(`\n`), log);
      break;
    } else if (wazirxHeaders.includes(csvRows[0])) {
      log.info(`Parsing csv as ${csvRows.length - 1} rows of wazirx data`);
      txns = wazirxParser(csvRows.join(`\n`), log);
      break;
    } else if (csvRows[0] === wyreHeaders) {
      log.info(`Parsing csv as ${csvRows.length - 1} rows of wyre data`);
      txns = wyreParser(csvRows.join(`\n`), log);
      break;
    }
    csvRows.shift(); // First row doesn't match any of our target headers, discard it & try again
  }

  if (!txns) {
    log.warn(`Unknown csv file format`);
    return [];
  } else {
    const error = getTransactionsError(txns);
    if (error) throw new Error(error);
    return txns;
  }
};
