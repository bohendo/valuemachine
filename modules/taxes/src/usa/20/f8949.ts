import {
  Forms,
  Logger,
  math,
  TaxActions,
  TaxInput,
  TaxRow,
  thisYear,
  toFormDate,
} from "./utils";

const { add, mul, round, sub } = math;

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

  const trades = taxRows.filter(thisYear).filter(tax => tax.action === TaxActions.Trade);

  if (!trades.length) {
    delete forms.f8949;
    return forms;
  }

  ////////////////////////////////////////
  // L1: Report all trade info on f8949

  const msPerDay = 1000 * 60 * 60 * 24;
  const msPerYear = msPerDay * 365;

  const columns = ["d", "e", "g", "h"];
  const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

  const isLongTerm = (trade: TaxRow): boolean => 
    (new Date(trade.date).getTime() - new Date(trade.receiveDate).getTime()) > msPerYear;

  const pageDivider = (list: any[]): any[][] => list.map(
    (e,i) => i % rows.length === 0 ? list.slice(i, i + rows.length) : null,
  ).filter(e => !!e);

  const shortPages = pageDivider(trades.filter(trade => !isLongTerm(trade)));
  const longPages = pageDivider(trades.filter(isLongTerm));

  const getLongCell = (row: number, column: string): string => `P2L1${column}R${row}`;
  const getShortCell = (row: number, column: string): string => `P1L1${column}R${row}`;

  // Convert chunk of vmEvents into f8949 rows
  const nPages = longPages.length > shortPages.length ? longPages.length : shortPages.length;
  for (let page = 0; page < nPages; page++) {
    const shortTerm = shortPages[page] || [];
    const longTerm = longPages[page] || [];
    log.info(`Filling in f8949 page ${page} with ${
      shortTerm.length
    } short term trades & ${longTerm.length} long term trades`);
    const subF8949 = {} as any;
    subF8949.P1_Name = subF8949.P2_Name = name;
    subF8949.P1_SSN = subF8949.P2_SSN = ssn;
    subF8949.P1_CC = shortTerm.length > 0;
    subF8949.P2_CF = longTerm.length > 0;
    const fillPage = getCell => (trade: TaxRow, i: number): void => {
      const proceeds = mul(trade.amount, trade.price);
      const cost = mul(trade.amount, trade.receivePrice);
      subF8949[getCell(i+1, "a")] = `${round(trade.amount, 4)} ${trade.asset}`;
      subF8949[getCell(i+1, "b")] = toFormDate(trade.receiveDate);
      subF8949[getCell(i+1, "c")] = toFormDate(trade.date);
      subF8949[getCell(i+1, "d")] = proceeds;
      subF8949[getCell(i+1, "e")] = cost;
      subF8949[getCell(i+1, "h")] = sub(proceeds, cost);
    };
    shortTerm.forEach(fillPage(getShortCell));
    longTerm.forEach(fillPage(getLongCell));
    f8949.push(subF8949);
  }

  ////////////////////////////////////////
  // L2: Calculate totals from f8949 rows

  f8949.forEach(page => {
    for (const column of columns) {
      for (const row of rows) {
        page[`P1L2${column}`] = add(
          page[`P1L2${column}`] || "0",
          page[getShortCell(row, column)],
        );
        page[`P2L2${column}`] = add(
          page[`P2L2${column}`] || "0",
          page[getLongCell(row, column)],
        );
      }
    }
  });

  return { ...forms, f8949 };
};
