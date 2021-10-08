import {
  Transaction,
  Logger,
  TransferCategories,
} from "@valuemachine/types";
import { hashCsv } from "@valuemachine/utils";
import csv from "csv-parse/lib/sync";

import { Assets, CsvSources, Methods } from "../../enums";

export const digitaloceanParser = (
  csvData: string,
  logger: Logger,
): Transaction[] => {
  const source = CsvSources.DigitalOcean;
  const log = logger.child({ module: source });
  log.info(`Processing ${csvData.split(`\n`).length - 2} rows of digital ocean data`);
  return csv(csvData, { columns: true, skip_empty_lines: true }).map((row, rowIndex) => {

    const {
      ["description"]: description,
      ["USD"]: amount,
      ["start"]: date,
    } = row;
    log.info(`Paid digital ocean for ${description}`);
    const transaction = {
      apps: [],
      date: (new Date(date)).toISOString(),
      method: Methods.Payment,
      sources: [source],
      transfers: [],
      uuid: `${source}/${hashCsv(csvData)}/${rowIndex}`,
    } as Transaction;
    transaction.transfers.push({
      asset: Assets.USD,
      category: TransferCategories.Expense,
      from: "USD-account",
      amount: amount.replace("$", ""),
      to: source,
    });

    log.debug(transaction, "Parsed row into transaction:");
    return transaction;
  }).filter(tx => !!tx);
};

