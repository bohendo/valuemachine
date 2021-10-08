import { Logger, TransactionsJson } from "@valuemachine/types";
import { getLogger, getTransactionsError } from "@valuemachine/utils";

import { coinbaseParser } from "./apps/coinbase";
import { digitaloceanParser } from "./apps/digitalocean";
import { elementsParser } from "./apps/elements";
import { wyreParser } from "./apps/wyre";
import { wazirxParser } from "./apps/wazirx";
import { CsvSources } from "./enums";

const csvHeadings = {
  Coinbase: `Timestamp,Transaction Type,Asset,Quantity Transacted,USD Spot Price at Transaction,USD Subtotal,USD Total (inclusive of fees),USD Fees,Notes`,
  Wyre: `"Closed At","Created At","Id","Source","Dest","Source Currency","Dest Currency","Source Amount","Dest Amount","Fees ETH","Type","Source Name","Dest Name","Status","Message","Exchange Rate","ETH Debit","ETH Fee Debit","USD Fee Debit","Blockchain Tx Id","ETH Credit","Fees DAI","DAI Debit","DAI Fee Debit","DAI Credit","Fees USD","USD Debit","USD Credit","Fees BTC","BTC Debit","BTC Fee Debit","BTC Credit"`,
  Elements: `Account Number,Post Date,Check,Description,Debit,Credit,Status,Balance,Classification`,
  DigitalOcean: `product,group_description,description,hours,start,end,USD,project_name`,
  WazirxDeposits: `Date,Transaction,Currency,Volume`,
  WazirxTrades: `Date,Market,Price,Volume,Total,Trade,"Fee Currency",Fee`,
};

export const parseCsv = (csvData: string, logger: Logger): TransactionsJson => {
  const log = logger || getLogger();

  // Discard any garbage present at the top of the file
  let txns;
  if (csvData.includes(csvHeadings.Coinbase)) {
    txns = coinbaseParser(csvData, log);
  } else if (csvData.includes(csvHeadings.DigitalOcean)) {
    txns = digitaloceanParser(csvData, log);
  } else if (csvData.includes(csvHeadings.Elements)) {
    txns = elementsParser(csvData, log);
  } else if (
    csvData.includes(csvHeadings.WazirxDeposits) ||
    csvData.includes(csvHeadings.WazirxTrades)
  ) {
    txns = wazirxParser(csvData, log);
  } else if (csvData.includes(csvHeadings.Wyre)) {
    txns = wyreParser(csvData, log);
  } else {
    log.warn(`Unknown csv file, expected one of [${Object.keys(CsvSources).join()}]`);
  }

  const error = getTransactionsError(txns);
  if (error) throw new Error(error);
  return txns;
};
