import {
  AddressBook,
  Asset,
  DateString,
  DateTimeString,
  EventTypes,
  Guard,
  GuardChangeEvent,
  Prices,
  TaxRow,
  TradeEvent,
  TxTags,
  ValueMachine,
} from "@valuemachine/types";
import {
  add,
  chrono,
  mul,
  round as defaultRound,
  sub,
} from "@valuemachine/utils";

import { allTaxYears, securityFeeMap } from "./constants";
import { getTaxYearBoundaries } from "./utils";

const round = n => defaultRound(n, 2, false);

export const getTaxRows = ({
  addressBook,
  guard,
  prices,
  taxYear,
  txTags,
  userUnit,
  vm,
}: {
  addressBook: AddressBook;
  guard: Guard;
  prices: Prices;
  taxYear?: string;
  txTags?: TxTags,
  userUnit?: Asset;
  vm: ValueMachine;
}): TaxRow[] => {
  const unit = securityFeeMap[guard] || userUnit;
  if (!unit) throw new Error(`Security asset is unknown for ${guard}`);

  const taxYearBoundaries = getTaxYearBoundaries(guard, taxYear);

  return vm?.json?.events.sort(chrono).filter(evt => {
    const time = new Date(evt.date).getTime();
    const tags = txTags?.[evt.txId] || {};
    if (taxYear && taxYear !== allTaxYears && (
      time < taxYearBoundaries[0] || time > taxYearBoundaries[1]
    )) return false;
    const toGuard = (
      (evt as GuardChangeEvent).to || (evt as TradeEvent).account || ""
    ).split("/")[0];
    return (
      evt.type === EventTypes.Trade || evt.type === EventTypes.Income
    ) && ((
      toGuard === guard
    ) || (
      tags.physicalGuard === guard
    ) || (
      evt.account && addressBook.getGuard(evt.account) === guard
    ));
  }).reduce((rows, evt) => {
    const getDate = (datetime: DateTimeString): DateString =>
      new Date(datetime).toISOString().split("T")[0];
    const date = getDate(evt.date);

    if (evt.type === EventTypes.Trade) {
      if (!evt.outputs) { console.warn(`Missing ${evt.type} outputs`, evt); return rows; }
      return rows.concat(...evt.outputs.map(chunkIndex => {
        const chunk = vm.getChunk(chunkIndex);
        const price = prices.getNearest(date, chunk.asset, unit) || "0";
        if (chunk.asset !== unit && price !== "0") {
          const value = mul(chunk.amount, price);
          const receivePrice = prices.getNearest(chunk.history[0]?.date, chunk.asset, unit);
          const capitalChange = mul(chunk.amount, sub(price, receivePrice || "0"));
          return {
            date: date,
            action: EventTypes.Trade,
            amount: defaultRound(chunk.amount, 6),
            asset: chunk.asset,
            price: round(price),
            value: round(value),
            receivePrice: round(receivePrice),
            receiveDate: getDate(chunk.history[0].date),
            capitalChange: round(capitalChange),
            tags: txTags?.[evt.txId] || [],
          };
        } else {
          return null;
        }
      }).filter(row => !!row) as TaxRow[]);

    } else if (evt.type === EventTypes.Income) {
      if (!evt.inputs) { console.warn(`Missing ${evt.type} inputs`, evt); return rows; }
      return rows.concat(...evt.inputs.map(chunkIndex => {
        const chunk = vm.getChunk(chunkIndex);
        const price = prices.getNearest(date, chunk.asset, unit) || "0";
        const income = mul(chunk.amount, price);
        return {
          date: date,
          action: EventTypes.Income,
          amount: defaultRound(chunk.amount, 6),
          asset: chunk.asset,
          price: round(price),
          value: round(income),
          receivePrice: round(price),
          receiveDate: date,
          capitalChange: "0.00",
          tags: txTags?.[evt.txId] || [],
        } as TaxRow;
      }));

    } else {
      return rows;
    }
  }, [] as TaxRow[]).reduce((rows, row) => {

    const dupRow = rows.find(r =>
      r.asset === row.asset &&
      r.date === row.date &&
      r.receiveDate === row.receiveDate
    );
    if (dupRow) {
      dupRow.amount = add(dupRow.amount, row.amount);
      dupRow.value = add(dupRow.value, row.value);
    } else {
      rows.push(row);
    }
    return rows;

  }, [] as TaxRow[]);

};
