import {
  Transaction,
  Logger,
  TransferCategories,
} from "@valuemachine/types";
import { hashCsv } from "@valuemachine/utils";
import csv from "csv-parse/lib/sync";

import { Assets, CsvSources, Guards, Methods } from "../../enums";

const guard = Guards.USA;
const source = CsvSources.DigitalOcean;
const dateKey = "start";

export const digitaloceanHeaders = [`
product,
group_description,
description,
hours,
${dateKey},
end,
USD,
project_name
`.replace(/\n/g, "")];

export const digitaloceanParser = (
  csvData: string,
  logger: Logger,
): Transaction[] => {
  const log = logger.child({ module: source });
  log.info(`Processing ${csvData.split(`\n`).length - 2} rows of digital ocean data`);
  return csv(csvData, { columns: true, skip_empty_lines: true }).sort((r1, r2) => {
    return new Date(r1[dateKey]).getTime() - new Date(r2[dateKey]).getTime();
  }).map((row, rowIndex) => {

    const {
      ["description"]: description,
      ["USD"]: amount,
      [dateKey]: date,
    } = row;
    log.info(`Paid digital ocean for ${description}`);
    const transaction = {
      apps: [],
      date: (new Date(date)).toISOString(),
      index: rowIndex,
      method: Methods.Payment,
      sources: [source],
      transfers: [],
      uuid: `${source}/${hashCsv(csvData)}/${rowIndex}`,
    } as Transaction;
    transaction.transfers.push({
      amount: amount.replace("$", ""),
      asset: Assets.USD,
      category: TransferCategories.Expense,
      from: `${guard}/default`,
      index: 1,
      to: `${guard}/${source}`,
    });

    log.debug(transaction, "Parsed row into transaction:");
    return transaction;
  }).filter(tx => !!tx);
};
