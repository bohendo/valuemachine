import { Logger } from "@valuemachine/types";
import { chrono, getLogger, digest, slugify } from "@valuemachine/utils";

import { TransactionsJson } from "../types";
import { getTransactionsError } from "../utils";

import { CsvFile } from "./types";
import { headersToSource, getCsvParser } from "./apps";

export const cleanCsv = (csvData: string, csvName?: string): CsvFile => {
  const csvRows = csvData.split(/\r?\n/);
  let source: string;
  while (csvRows.length) {
    source = headersToSource(csvRows[0]);
    if (source) break;
    csvRows.shift(); // First row doesn't match any of our target headers, discard it & try again
  }
  const cleanCsvData = csvRows.join("\n");
  if (!source) {
    throw new Error(`Unknown csv file format${csvName ? `for ${csvName}` : ""}`);
  }
  return {
    data: cleanCsvData,
    digest: digest(cleanCsvData),
    name: csvName || `${slugify(source)}.csv`,
    source,
  };
};

export const parseCsv = (csvData: string, logger?: Logger): TransactionsJson => {
  const log = logger || getLogger();
  const csv = cleanCsv(csvData);
  const txns = getCsvParser(csv.source)?.(csv.data, log);
  txns.sort(chrono);
  txns.forEach((tx, i) => { tx.index = i; });
  if (!txns?.length) {
    log.warn(`Unknown csv format or empty file provided for ${csv.name}`);
    return [];
  } else {
    const error = getTransactionsError(txns);
    if (error) throw new Error(error);
    return txns;
  }
};
