import { Logger } from "@valuemachine/types";
import { digest, math } from "@valuemachine/utils";
import csv from "csv-parse/lib/sync";

import { Assets, CsvSources, Guards, Methods, TransferCategories } from "../../enums";
import { Transaction } from "../../types";
import { getGuard } from "../../utils";

const guard = Guards.USA;
const source = CsvSources.Coinbase;
const dateKey = "Timestamp";

export const coinbaseHeaders = [`
${dateKey},
Transaction Type,
Asset,
Quantity Transacted,
USD Spot Price at Transaction,
USD Subtotal,
USD Total (inclusive of fees),
USD Fees,
Notes
`.replace(/\n/g, ""), `
${dateKey},
Transaction Type,
Asset,
Quantity Transacted,
Spot Price Currency,
Spot Price at Transaction,
Subtotal,
Total (inclusive of fees),
Fees,
Notes
`.replace(/\n/g, "")];

export const coinbaseParser = (
  csvData: string,
  logger: Logger,
): Transaction[] => {
  const log = logger.child({ name: source }); 
  log.info(`Processing ${csvData.split(`\n`).length - 2} rows of ${source} data`);
  return csv(csvData, { columns: true, skip_empty_lines: true }).sort((r1, r2) => {
    return new Date(r1[dateKey]).getTime() - new Date(r2[dateKey]).getTime();
  }).map((row, rowIndex) => {
    const {
      ["Asset"]: asset,
      ["Quantity Transacted"]: amount,
      [dateKey]: date,
      ["Transaction Type"]: txType,
      ["USD Subtotal"]: usdSubtotal,
      ["USD Total (inclusive of fees)"]: usdTotal,
    } = row;

    // Note: for Sell, the usdTotal already has the fee taken out so usdTotal < usdSubtotal
    // For Buy, the usdTotal includes the fee so usdTotal > usdSubtotal
    const fee = math.diff(usdTotal, usdSubtotal);
    const account = `${guard}/${source}/account`;
    const exchange = `${guard}/${source}`;
    const external = `${getGuard(asset)}/default`;

    // NOTE: Coinbase doesn't provide info re transfers to/from bank
    // as a workaround, pretend like coinbase can't hold USD
    // always transfer USD to/from the bank during every sell/buy
    const bank = `${guard}/default`;

    const transaction = {
      apps: [],
      date: (new Date(date)).toISOString(),
      index: rowIndex,
      method: Methods.Unknown,
      sources: [source],
      tag: { physicalGuard: guard },
      transfers: [],
      uuid: `${source}/${digest(csvData)}-${rowIndex}`,
    } as Transaction;

    let transferIndex = 1;
    if (txType === "Send") {
      transaction.transfers.push({
        amount,
        asset,
        category: TransferCategories.Internal,
        from: account,
        index: transferIndex++,
        to: external,
      });
      transaction.method = Methods.Withdraw;

    } else if (txType === "Receive") {
      transaction.transfers.push({
        amount,
        asset,
        category: TransferCategories.Internal,
        from: external,
        index: transferIndex++,
        to: account,
      });
      transaction.method = Methods.Deposit;

    } else if (txType === "Sell") {
      transaction.transfers.push({
        amount,
        asset,
        category: TransferCategories.SwapOut,
        from: account,
        index: transferIndex++,
        to: exchange,
      }, {
        amount: usdSubtotal,
        asset: Assets.USD,
        category: TransferCategories.SwapIn,
        from: exchange,
        index: transferIndex++,
        to: account,
      }, {
        amount: usdTotal,
        asset: Assets.USD,
        category: TransferCategories.Internal,
        from: account,
        index: transferIndex++,
        to: bank,
      });
      transaction.method = txType;

    } else if (txType === "Buy") {
      transaction.transfers.push({
        amount: usdTotal,
        asset: Assets.USD,
        category: TransferCategories.Internal,
        from: bank,
        index: transferIndex++,
        to: account,
      }, {
        amount: usdSubtotal,
        asset: Assets.USD,
        category: TransferCategories.SwapOut,
        from: account,
        index: transferIndex++,
        to: exchange,
      }, {
        amount,
        asset,
        category: TransferCategories.SwapIn,
        from: exchange,
        index: transferIndex++,
        to: account,
      });
      transaction.method = txType;
    }

    if (math.gt(fee, "0")) {
      transaction.transfers.push({
        amount: fee,
        asset: Assets.USD,
        category: TransferCategories.Expense,
        from: account,
        index: transferIndex++,
        to: exchange,
      });
    }

    return transaction;
  }).filter(tx => !!tx);
};

