import { Assets, Guards } from "@valuemachine/transactions";
import { EventTypes, TradeEvent, Prices, ValueMachine } from "@valuemachine/types";
import { getLogger, add, gt, mul, round, sub } from "@valuemachine/utils";

const log = getLogger().child({ module: "Taxes" }, { level: "debug" });

const guard = Guards.USA;
const unit = Assets.USD;

type Trade = {
  date: string;
  purchaseDate: string;
  asset: string;
  assetPrice: string;
  receivePrice: string;
  amount: string;
};

// returns an array of form data
export const f8949 = (
  vm: ValueMachine,
  prices: Prices,
  taxYear: string,
): any[] => {
  if (!vm?.json?.chunks?.length || !prices.json || !taxYear) {
    log.warn(`Missing args, not requesting f8949`);
    return [];
  }

  const getDate = (timestamp: string): string => timestamp.split("T")[0];
  const trades = [];
  // we should merge chunks w the same receiveDate + disposeDate
  for (const event of vm.json.events) {
    if (event.type !== EventTypes.Trade || event.account?.startsWith(`${guard}/`)) continue;
    for (const chunkIndex of (event as TradeEvent).outputs) {
      const chunk = vm.getChunk(chunkIndex);
      if (chunk.disposeDate?.startsWith(taxYear)) {
        const purchaseDate = getDate(chunk.history[0].date);
        const receivePrice = prices.getNearest(purchaseDate, chunk.asset, unit);
        const assetPrice = prices.getNearest(chunk.disposeDate, chunk.asset, unit);
        if (receivePrice !== assetPrice) {
          trades.push({
            date: getDate(chunk.disposeDate),
            asset: chunk.asset,
            receivePrice,
            assetPrice,
            purchaseDate: purchaseDate,
            amount: chunk.amount,
          });
        }
      }
    }
  }

  if (trades.length) {

    const f8949 = [];

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
    return f8949.map((page, p): any => {
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
  }
  return [];
};
