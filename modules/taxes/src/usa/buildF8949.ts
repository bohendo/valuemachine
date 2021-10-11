import { getLogger, add, gt, mul, round, sub } from "@valuemachine/utils";

import * as f8949Mappings from "./f8949-mappings.json";

const log = getLogger().child({ module: "Taxes" }, { level: "debug" });

type Trade = {
  date: string;
  purchaseDate: string;
  asset: string;
  assetPrice: string;
  receivePrice: string;
  amount: string;
};

export const buildF8949 = (trades: Trade[], fs: any, execSync: any): string => {
  log.info(`Getting tax forms for ${trades.length} trades`);
  if (trades.length) {

    let f8949 = [];

    const toFormDate = (date: string): string => {
      const pieces = date.split("T")[0].split("-");
      return `${pieces[1]}, ${pieces[2]}, ${pieces[0]}`;
    };

    const msPerDay = 1000 * 60 * 60 * 24;
    const msPerYear = msPerDay * 365;

    const columns = ["d", "e", "g", "h"];
    const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    const isLongTerm = (trade: Trade): boolean => 
      (new Date(trade.date).getTime() - new Date(trade.purchaseDate).getTime()) >= msPerYear;
    const chunkify = (list: any[]): any[][] => list.map(
      (e,i) => i % rows.length === 0 ? list.slice(i, i + rows.length) : null,
    ).filter(e => !!e);
    const shortChunks = chunkify(trades.filter(trade => !isLongTerm(trade)));
    const longChunks = chunkify(trades.filter(isLongTerm));
    const nPages = longChunks.length > shortChunks.length ? longChunks.length : shortChunks.length;
    const getLongCell = (row: number, column: string): string => `P2L1R${row}${column}`;
    const getShortCell = (row: number, column: string): string => `P1L1R${row}${column}`;

    // Convert chunk of vmEvents into f8949 rows
    for (let page = 0; page < nPages; page++) {
      const shortTerm = shortChunks[page] || [];
      const longTerm = longChunks[page] || [];
      const subF8949 = {} as any;
      subF8949.P1C0_C = shortTerm.length > 0;
      subF8949.P2C0_F = longTerm.length > 0;
      const parseTrade = getCell => (trade: Trade, index: number): void => {
        const i = index + 1;
        const description = `${round(trade.amount, 4)} ${trade.asset}`;
        const proceeds = round(mul(trade.amount, trade.assetPrice));
        const cost = round(mul(trade.amount, trade.receivePrice));
        const gainOrLoss = sub(proceeds, cost);
        const pad = (str: string, n = 9): string => str.padStart(n, " ");
        log.info(
          `${trade.date.split("T")[0]} Sold ${pad(round(trade.amount, 3))} ` +
          `${pad(trade.asset, 4)} for ${pad(proceeds)} - ` + 
          `${pad(cost)} = ${pad(gainOrLoss)} profit`,
        );
        subF8949[getCell(i, "a")] = description;
        subF8949[getCell(i, "b")] = toFormDate(trade.purchaseDate);
        subF8949[getCell(i, "c")] = toFormDate(trade.date);
        subF8949[getCell(i, "d")] = proceeds;
        subF8949[getCell(i, "e")] = cost;
        subF8949[getCell(i, "h")] = gainOrLoss;
      };
      shortTerm.forEach(parseTrade(getShortCell));
      longTerm.forEach(parseTrade(getShortCell));
      f8949.push(subF8949);
    }

    // Calculate totals from f8949 rows
    f8949 = f8949.map((page, p): any => {
      const shortTotal = {};
      const longTotal = {};
      for (const column of columns) {
        shortTotal[column] = "0";
        longTotal[column] = "0";
      }
      for (const column of columns) {
        for (const row of rows) {
          const shortCell = getShortCell(row, column);
          const longCell = getLongCell(row, column);
          if (gt(page[shortCell], "0")) {
            log.debug(`Adding short-term trade ${page[shortCell]} to ${shortTotal[column]}`);
          }
          if (gt(page[longCell], "0")) {
            log.debug(`Adding long-term trade ${page[longCell]} to ${longTotal[column]}`);
          }
          shortTotal[column] = add(shortTotal[column], page[shortCell]);
          longTotal[column] = add(longTotal[column], page[longCell]);
        }
      }
      for (const column of columns) {
        log.debug(`Subtotal ${p} ${column}: short=${shortTotal[column]} long=${longTotal[column]}`);
        page[`P1L2${column}`] = round(shortTotal[column]);
        page[`P2L2${column}`] = round(longTotal[column]);
      }
      return page;
    });

    const translate = (form, mappings): any => {
      const newForm = {};
      for (const [key, value] of Object.entries(form)) {
        if (key === "default") { continue; }
        if (!mappings[key]) {
          log.warn(`Key ${key} exists in output data but not in mappings`);
        }
        if (
          !["_dec", "_int"].some(suffix => key.endsWith(suffix)) &&
          key.match(/L[0-9]/) &&
          typeof value === "string" &&
          value.match(/^-?[0-9.]+$/)
        ) {
          newForm[mappings[key]] = round(value);
          if (newForm[mappings[key]].startsWith("-")) {
            newForm[mappings[key]] = `(${newForm[mappings[key]].substring(1)})`;
          }
        } else {
          newForm[mappings[key]] = value;
        }
      }
      return newForm;
    };

    for (const page in f8949) {
      const filename = `/tmp/f8949-${page}.json`;
      log.info(`Saving page ${page} to disk as ${filename}`);
      fs.writeFileSync(filename, JSON.stringify(translate(f8949[page], f8949Mappings)));
    }

    const cmd = "bash node_modules/@valuemachine/taxes/ops/f8949.sh";
    const stdout = execSync(cmd);
    log.info(`Got output from ${cmd}: ${stdout}`);
    return "/tmp/f8949.pdf";
  }
  return "taxes/f8949.pdf";
};
