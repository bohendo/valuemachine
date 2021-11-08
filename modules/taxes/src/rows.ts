import { Guards, PhysicalGuards } from "@valuemachine/transactions";
import {
  AddressBook,
  Asset,
  DateString,
  DateTimeString,
  EventTypes,
  Guard,
  GuardChangeEvent,
  Prices,
  TaxActions,
  TaxRow,
  TradeEvent,
  TxTags,
  ValueMachine,
} from "@valuemachine/types";
import {
  chrono,
  math,
} from "@valuemachine/utils";

import { allTaxYears, securityFeeMap } from "./constants";
import { getTaxYearBoundaries } from "./utils";

const round = n => math.round(n, 2, false);

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
    const tag = { ...(evt.tag || {}), ...(txTags?.[evt.txId] || {}) };
    if (taxYear && taxYear !== allTaxYears && (
      time < taxYearBoundaries[0] || time > taxYearBoundaries[1]
    )) return false;
    const account = (evt as TradeEvent).account || (evt as GuardChangeEvent).to || "";
    const evtGuard = tag.physicalGuard || (
      account ? addressBook.getGuard(account) : ""
    ) || account.split("/")[0];
    return (
      evt.type === EventTypes.Trade ||
      evt.type === EventTypes.Income ||
      evt.type === EventTypes.Expense
    ) && ((
      evtGuard === guard
    ) || (
      guard === Guards.None && !Object.keys(PhysicalGuards).includes(evtGuard)
    ));
  }).reduce((rows, evt) => {
    const getDate = (datetime: DateTimeString): DateString =>
      new Date(datetime).toISOString().split("T")[0];
    const date = getDate(evt.date);
    const tag = { ...(evt.tag || {}), ...(txTags?.[evt.txId] || {}) };

    if (evt.type === TaxActions.Trade) {
      if (!evt.outputs) { console.warn(`Missing ${evt.type} outputs`, evt); return rows; }
      return rows.concat(...evt.outputs.map(chunkIndex => {
        const chunk = vm.getChunk(chunkIndex);
        const price = prices.getNearest(date, chunk.asset, unit) || "0";
        if (chunk.asset !== unit && price !== "0") {
          const value = math.mul(chunk.amount, price);
          const receivePrice = prices.getNearest(chunk.history[0]?.date, chunk.asset, unit);
          const capitalChange = math.mul(chunk.amount, math.sub(price, receivePrice || "0"));
          return {
            date: date,
            action: TaxActions.Trade,
            amount: math.round(chunk.amount, 6),
            asset: chunk.asset,
            price: round(price),
            value: round(value),
            receivePrice: round(receivePrice),
            receiveDate: getDate(chunk.history[0].date),
            capitalChange: round(capitalChange),
            tag,
          };
        } else {
          return null;
        }
      }).filter(row => !!row) as TaxRow[]);

    } else if (evt.type === TaxActions.Income) {
      if (!evt.inputs) { console.warn(`Missing ${evt.type} inputs`, evt); return rows; }
      return rows.concat(...evt.inputs.map(chunkIndex => {
        const chunk = vm.getChunk(chunkIndex);
        const price = prices.getNearest(date, chunk.asset, unit) || "0";
        const income = math.mul(chunk.amount, price);
        return {
          date: date,
          action: TaxActions.Income,
          amount: math.round(chunk.amount, 6),
          asset: chunk.asset,
          price: round(price),
          value: round(income),
          receivePrice: round(price),
          receiveDate: date,
          capitalChange: "0.00",
          tag,
        } as TaxRow;
      }));

    } else if (evt.type === TaxActions.Expense) {
      if (!evt.outputs) { console.warn(`Missing ${evt.type} outputs`, evt); return rows; }
      return rows.concat(...evt.outputs.map(chunkIndex => {
        const chunk = vm.getChunk(chunkIndex);
        const price = prices.getNearest(date, chunk.asset, unit) || "0";
        const value = math.mul(chunk.amount, price);
        const receiveDate = chunk.history[0]?.date.split("T")[0];
        let receivePrice, capitalChange;
        if (chunk.asset !== unit && price !== "0") {
          receivePrice = prices.getNearest(receiveDate, chunk.asset, unit);
          capitalChange = math.mul(chunk.amount, math.sub(price, receivePrice || "0"));
        } else {
          receivePrice = price;
          capitalChange = "0";
        }
        // TODO: add tag based on the recipient of this expense
        // eg if it's an expense to coinbase, then tag it as an exchange fee
        return {
          date: date,
          action: TaxActions.Expense,
          amount: math.round(chunk.amount, 6),
          asset: chunk.asset,
          price: round(price),
          value: round(value),
          receivePrice: round(receivePrice),
          receiveDate,
          capitalChange,
          tag,
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
      dupRow.amount = math.add(dupRow.amount, row.amount);
      dupRow.value = math.add(dupRow.value, row.value);
    } else {
      rows.push(row);
    }
    return rows;

  }, [] as TaxRow[]).filter(row => math.gt(row.value, "0.01"));

};
