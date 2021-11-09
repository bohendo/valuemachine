import {
  TaxActions,
  Forms,
  Logger,
  math,
  TaxInput,
  TaxRow,
  toFormDate,
} from "./utils";

const { add, gt, mul, round, sub } = math;

export const f8949 = (
  forms: Forms,
  input: TaxInput,
  taxRows: TaxRow[],
  logger: Logger,
): Forms  => {
  const log = logger.child({ module: "f8949" });
  const { f8949 } = forms;
  const { personal } = input;

  const name = `${personal?.firstName || ""} ${personal?.lastName || ""}`;
  const ssn = personal?.SSN;

  // Merge trades w the same received & sold dates
  const trades = taxRows.filter(tax => tax.action === TaxActions.Trade);

  if (!trades.length) {
    delete forms.f8949;
    return forms;
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const msPerYear = msPerDay * 365;

  const columns = ["d", "e", "g", "h"];
  const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const isLongTerm = (trade: TaxRow): boolean => 
    (new Date(trade.date).getTime() - new Date(trade.receiveDate).getTime()) >= msPerYear;
  const chunkify = (list: any[]): any[][] => list.map(
    (e,i) => i % rows.length === 0 ? list.slice(i, i + rows.length) : null,
  ).filter(e => !!e);
  const shortChunks = chunkify(trades.filter(trade => !isLongTerm(trade)));
  const longChunks = chunkify(trades.filter(isLongTerm));
  const getLongCell = (row: number, column: string): string => `P2L1${column}R${row}`;
  const getShortCell = (row: number, column: string): string => `P1L1${column}R${row}`;

  // Convert chunk of vmEvents into f8949 rows
  const nPages = longChunks.length > shortChunks.length ? longChunks.length : shortChunks.length;
  for (let page = 0; page < nPages; page++) {
    const shortTerm = shortChunks[page] || [];
    const longTerm = longChunks[page] || [];
    log.info(`Filling in f8949 page ${page} with ${shortTerm.length} short term trades & ${longTerm.length} long term trades`);
    const subF8949 = {} as any;
    subF8949.P1_Name = name;
    subF8949.P1_SSN = ssn;
    subF8949.P2_Name = subF8949.P1_Name;
    subF8949.P2_SSN = subF8949.P1_SSN;
    subF8949.P1_CC = shortTerm.length > 0;
    subF8949.P2_CF = longTerm.length > 0;
    const parseTrade = getCell => (trade: TaxRow, index: number): void => {
      const i = index + 1;
      const description = `${round(trade.amount, 4)} ${trade.asset}`;
      const proceeds = round(mul(trade.amount, trade.price));
      const cost = round(mul(trade.amount, trade.receivePrice));
      const gainOrLoss = sub(proceeds, cost);
      const pad = (str: string, n = 9): string => str.padStart(n, " ");
      log.info(
        `${trade.date.split("T")[0]} Sold ${pad(round(trade.amount, 3))} ` +
        `${pad(trade.asset, 4)} for ${pad(proceeds)} - ` + 
        `${pad(cost)} = ${pad(gainOrLoss)} profit`,
      );
      subF8949[getCell(i, "a")] = description;
      subF8949[getCell(i, "b")] = toFormDate(trade.receiveDate);
      subF8949[getCell(i, "c")] = toFormDate(trade.date);
      subF8949[getCell(i, "d")] = proceeds;
      subF8949[getCell(i, "e")] = cost;
      subF8949[getCell(i, "h")] = gainOrLoss;
    };
    shortTerm.forEach(parseTrade(getShortCell));
    longTerm.forEach(parseTrade(getLongCell));
    f8949.push(subF8949);
  }

  // Calculate totals from f8949 rows
  f8949.forEach((page, index): any => {
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
          log.info(`Adding short-term trade ${page[shortCell]} to ${shortTotal[column]}`);
        }
        if (gt(page[longCell], "0")) {
          log.info(`Adding long-term trade ${page[longCell]} to ${longTotal[column]}`);
        }
        shortTotal[column] = add(shortTotal[column], page[shortCell]);
        longTotal[column] = add(longTotal[column], page[longCell]);
      }
    }
    for (const column of columns) {
      log.debug(`Subtotal ${index} ${column}: short=${shortTotal[column]} long=${longTotal[column]}`);
      page[`P1L2${column}`] = round(shortTotal[column]);
      page[`P2L2${column}`] = round(longTotal[column]);
    }
  });

  return { ...forms, f8949 };
};
