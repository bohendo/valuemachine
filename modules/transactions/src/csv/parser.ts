import { Logger, TransactionsJson } from "@valuemachine/types";
import { getLogger, getTransactionsError } from "@valuemachine/utils";

import { coinbaseParser, coinbaseHeaders } from "./apps/coinbase";
import { digitaloceanParser, digitaloceanHeaders } from "./apps/digitalocean";
import { elementsParser, elementsHeaders } from "./apps/elements";
import { wyreParser, wyreHeaders } from "./apps/wyre";
import { wazirxParser, wazirxHeaders } from "./apps/wazirx";
import { CsvSources, CsvSources } from "./enums";

export const parseCsv = (csvData: string, logger: Logger): TransactionsJson => {
  const log = logger || getLogger();

  // Discard any garbage present at the top of the file
  let txns;
  if (csvData.includes(coinbaseHeaders)) {
    txns = coinbaseParser(csvData, log);
  } else if (csvData.includes(digitaloceanHeaders)) {
    txns = digitaloceanParser(csvData, log);
  } else if (csvData.includes(elementsHeaders)) {
    txns = elementsParser(csvData, log);
  } else if (wazirxHeaders.some(header => csvData.includes(header))) {
    txns = wazirxParser(csvData, log);
  } else if (csvData.includes(wyreHeaders)) {
    txns = wyreParser(csvData, log);
  } else {
    log.warn(`Unknown csv file, expected one of [${Object.keys(CsvSources).join()}]`);
  }

  const error = getTransactionsError(txns);
  if (error) throw new Error(error);
  return txns;
};
