import {
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
import { digest, math } from "@valuemachine/utils";
import csv from "csv-parse/lib/sync";

import { Assets, CsvSources, Guards } from "../../enums";
import { getGuard } from "../../utils";

const guard = Guards.USA;
const { gt, sub } = math;
const { BTC, DAI, ETH, SAI, USD } = Assets;
const { Expense, SwapIn, SwapOut, Internal } = TransferCategories;
const dateKey = `Created At`;

const daiLaunch = new Date("2019-12-02T00:00:00Z").getTime();

export const wyreHeaders = [`
"Closed At",
"${dateKey}",
"Id",
"Source",
"Dest",
"Source Currency",
"Dest Currency",
"Source Amount",
"Dest Amount",
"Fees ETH",
"Type",
"Source Name",
"Dest Name",
"Status",
"Message",
"Exchange Rate",
"ETH Debit",
"ETH Fee Debit",
"USD Fee Debit",
"Blockchain Tx Id",
"ETH Credit",
"Fees DAI",
"DAI Debit",
"DAI Fee Debit",
"DAI Credit",
"Fees USD",
"USD Debit",
"USD Credit",
"Fees BTC",
"BTC Debit",
"BTC Fee Debit",
"BTC Credit"
`.replace(/\n/g, "")];

export const wyreParser = (
  csvData: string,
  logger: Logger,
): Transaction[] => {
  const source = CsvSources.Wyre;
  const log = logger.child({ module: source });
  log.info(`Processing ${csvData.split(`\n`).length - 2} rows of wyre data`);
  return csv(csvData, { columns: true, skip_empty_lines: true }).sort((r1, r2) => {
    return new Date(r1[dateKey]).getTime() - new Date(r2[dateKey]).getTime();
  }).map((row, rowIndex) => {

    // Ignore any rows with an invalid timestamp
    const date = new Date(row[dateKey]);
    if (isNaN(date.getUTCFullYear())) return null;

    const btcFee = parseFloat(row["Fees BTC"] || 0).toString();
    const daiFee = parseFloat(row["Fees DAI"] || 0).toString();
    const ethFee = parseFloat(row["Fees ETH"] || 0).toString();
    const usdFee = parseFloat(row["Fees USD"] || 0).toString();
    const {
      ["Dest Amount"]: destAmount,
      ["Dest Currency"]: rawDestType,
      ["Source Amount"]: sourceAmount,
      ["Source Currency"]: rawSourceType,
      ["Type"]: txType,
    } = row;

    const account = `${guard}/${source}/account`;
    const exchange = `${guard}/${source}`;

    const fixDai = asset => asset === DAI && date.getTime() < daiLaunch ? SAI : asset;
    const destType = fixDai(rawDestType);
    const sourceType = fixDai(rawSourceType);

    const transaction = {
      apps: [],
      date: date.toISOString(),
      index: rowIndex,
      sources: [source],
      tag: { physicalGuard: guard },
      transfers: [],
      uuid: `${source}/${digest(csvData)}-${rowIndex}`,
    } as Transaction;

    const fee = { category: Expense, from: account, to: exchange, index: 0 };
    if (gt(btcFee, "0")) transaction.transfers.push({ ...fee, asset: BTC, amount: daiFee });
    if (gt(daiFee, "0")) transaction.transfers.push({ ...fee, asset: fixDai(DAI), amount: daiFee });
    if (gt(ethFee, "0")) transaction.transfers.push({ ...fee, asset: ETH, amount: ethFee });
    if (gt(usdFee, "0")) transaction.transfers.push({ ...fee, asset: USD, amount: usdFee });

    const minusFee = (amount, asset) => asset === BTC ? sub(amount, btcFee)
      : (asset === DAI || asset === SAI) ? sub(amount, daiFee)
      : asset === ETH ? sub(amount, ethFee)
      : asset === USD ? sub(amount, usdFee)
      : amount;

    // Add transfers depending on exchange/currency types

    let transferIndex = 1;
    if (txType === "EXCHANGE") {
      transaction.transfers.push({
        amount: minusFee(sourceAmount, sourceType),
        asset: sourceType,
        category: SwapOut,
        from: account,
        index: transferIndex++,
        to: exchange,
      }, {
        amount: destAmount,
        asset: destType,
        category: SwapIn,
        from: exchange,
        index: transferIndex++,
        to: account,
      });
      transaction.method = sourceType === USD ? "Buy" : "Sell";

    } else if (txType === "INCOMING" && destType === sourceType) {
      transaction.transfers.push({
        amount: destAmount,
        asset: destType,
        category: Internal,
        from: `${getGuard(destType)}/default`,
        index: transferIndex++,
        to: account,
      });
      transaction.method = "Deposit";

    } else if (txType === "INCOMING" && destType !== sourceType) {
      transaction.transfers.push({
        amount: sourceAmount,
        asset: sourceType,
        category: Internal,
        from: `${getGuard(sourceType)}/default`,
        index: transferIndex++,
        to: account,
      }, {
        amount: minusFee(sourceAmount, sourceType),
        asset: sourceType,
        category: SwapOut,
        from: account,
        index: transferIndex++,
        to: exchange,
      }, {
        amount: destAmount,
        asset: destType,
        category: SwapIn,
        from: exchange,
        index: transferIndex++,
        to: account,
      });
      transaction.method = sourceType === USD ? "Buy" : "Sell";

    } else if (txType === "OUTGOING" && destType === sourceType) {
      transaction.transfers.push({
        amount: destAmount,
        asset: destType,
        category: Internal,
        from: account,
        index: transferIndex++,
        to: `${getGuard(destType)}/default`,
      });
      transaction.method = "Withdraw";

    } else if (txType === "OUTGOING" && destType !== sourceType) {
      transaction.transfers.push({
        amount: minusFee(sourceAmount, sourceType),
        asset: sourceType,
        category: SwapOut,
        from: account,
        index: transferIndex++,
        to: exchange,
      }, {
        amount: destAmount,
        asset: destType,
        category: SwapIn,
        from: exchange,
        index: transferIndex++,
        to: account,
      }, {
        amount: destAmount,
        asset: destType,
        category: Internal,
        from: account,
        index: transferIndex++,
        to: `${getGuard(destType)}/default`,
      });
      transaction.method = sourceType === USD ? "Buy" : "Sell";
    }

    log.debug(transaction, "Parsed row into transaction:");
    return transaction;
  }).filter(tx => !!tx);
};
