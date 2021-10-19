import { CsvFile, Logger, TransactionsJson } from "@valuemachine/types";
import { getLogger, getTransactionsError, hashCsv, slugify } from "@valuemachine/utils";

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
    throw new Error("Unknown csv file format");
  }
  return {
    data: cleanCsvData,
    digest: hashCsv(cleanCsvData),
    name: csvName || `${slugify(source)}.csv`,
    source,
  };
};

export const parseCsv = (csvData: string, logger?: Logger): TransactionsJson => {
  const log = logger || getLogger();
  const csv = cleanCsv(csvData);
  const txns = getCsvParser(csv.source)(csv.data, log);
  if (!txns) {
    log.warn(`Unknown csv file format`);
    return [];
  } else {
    const error = getTransactionsError(txns);
    if (error) throw new Error(error);
    return txns;
  }
};
