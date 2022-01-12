import { Logger } from "@valuemachine/types";
import { digest, math } from "@valuemachine/utils";
import csv from "csv-parse/lib/sync";

import { Assets, CsvSources, Guards, Methods, TransferCategories } from "../../enums";
import { Transaction } from "../../types";

const guard = Guards.USA;
const source = CsvSources.Elements;
const dateKey = "Post Date";

export const elementsHeaders = [`
Account Number,
${dateKey},
Check,
Description,
Debit,
Credit,
Status,
Balance,
Classification
`.replace(/\n/g, "")];

export const elementsParser = (
  csvData: string,
  logger: Logger,
): Transaction[] => {
  const log = logger.child({ name: source }); 
  log.info(`Processing ${csvData.split(`\n`).length - 2} rows of ${source} data`);
  return csv(csvData, { columns: true, skip_empty_lines: true }).sort((r1, r2) => {
    return new Date(r1[dateKey]).getTime() - new Date(r2[dateKey]).getTime();
  }).map((row, rowIndex) => {

    const {
      ["Balance"]: balance,
      ["Credit"]: credit,
      ["Debit"]: debit,
      ["Description"]: description,
      [dateKey]: date,
      ["Status"]: status,
    } = row;

    const amount = status === "Posted" ? (credit || math.mul(debit, "-1")) : "0";
    log.info(`Changed of $${amount} w new balance of ${balance} after: ${description}`);

    if (status !== "Posted") {
      log.warn(`Ignoring ${status} tx from ${source}: ${description}`);
      return null;
    }

    const account = `${guard}/${source}/account`;
    const bank = `${guard}/${source}`;
    const external = `${guard}/default`;
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
    if (debit) {
      transaction.transfers.push({
        amount: math.round(debit, 2),
        asset: Assets.USD,
        category: TransferCategories.Expense,
        from: account,
        index: transferIndex++,
        to: external,
      });
    }

    if (credit) {
      transaction.transfers.push({
        amount: math.round(credit, 2),
        asset: Assets.USD,
        category: TransferCategories.Income,
        from: description === "Interest Income" ? bank : external,
        index: transferIndex++,
        to: account,
      });
    }

    log.debug(transaction, "Parsed row into transaction:");
    return transaction;
  }).filter(tx => !!tx);
};

