import { PriceFns } from "@valuemachine/prices";
import { PhysicalGuards } from "@valuemachine/transactions";
import {
  AddressBook,
  Asset,
  DateString,
  DateTimeString,
  EventTypes,
  GuardChangeEvent,
  TaxActions,
  TaxRows,
  TradeEvent,
  TxTags,
  ValueMachine,
} from "@valuemachine/types";
import {
  chrono,
  math,
} from "@valuemachine/utils";

import { securityFeeMap } from "./constants";
import { getTaxYear } from "./utils";

export const getTaxRows = async ({
  addressBook,
  prices,
  txTags,
  userUnit,
  vm,
}: {
  addressBook: AddressBook;
  prices: PriceFns;
  txTags?: TxTags,
  userUnit?: Asset;
  vm: ValueMachine;
}): Promise<TaxRows> => {
  const rows = [] as TaxRows;
  for (const evt of vm?.json?.events.sort(chrono).filter(evt => (
    evt.type === EventTypes.Trade ||
    evt.type === EventTypes.Income ||
    evt.type === EventTypes.Expense
  ))) {

    const getDate = (datetime: DateTimeString): DateString =>
      new Date(datetime).toISOString().split("T")[0];
    const date = getDate(evt.date);
    const tag = { ...(evt.tag || {}), ...(txTags?.[evt.txId] || {}) };
    const txId = evt.txId;
    const account = (evt as TradeEvent).account || (evt as GuardChangeEvent).to || "";
    let guard = tag.physicalGuard || (
      account ? addressBook.getGuard(account) : ""
    ) || account.split("/")[0];
    if (guard.length > 3) guard = PhysicalGuards.IDK; // if len > 3 then it's an unknown guard
    const unit = securityFeeMap[guard] || userUnit;
    const taxYear = getTaxYear(guard, date);
    if (!unit) throw new Error(`Security asset is unknown for guard=${guard}`);

    if (evt.type === TaxActions.Trade) {
      if (!evt.outputs) { console.warn(`Missing ${evt.type} outputs`, evt); continue; }
      rows.push(...evt.outputs.map(chunkIndex => {
        const chunk = vm.getChunk(chunkIndex);
        const price = prices.getNearest(date, chunk.asset, unit) || "0";
        if (chunk.asset !== unit && price !== "0") {
          const value = math.mul(chunk.amount, price);
          const receivePrice = prices.getNearest(chunk.history[0]?.date, chunk.asset, unit);
          const capitalChange = math.mul(chunk.amount, math.sub(price, receivePrice || "0"));
          return {
            date: date,
            taxYear,
            action: TaxActions.Trade,
            amount: chunk.amount,
            asset: chunk.asset,
            price: price,
            value: value,
            receivePrice: receivePrice,
            receiveDate: getDate(chunk.history[0].date),
            capitalChange: capitalChange,
            tag,
            txId,
          };
        } else {
          return null;
        }
      }).filter(row => !!row) as TaxRows);

    } else if (evt.type === TaxActions.Income) {
      if (!evt.inputs) { console.warn(`Missing ${evt.type} inputs`, evt); continue; }
      rows.push(...evt.inputs.map(chunkIndex => {
        const chunk = vm.getChunk(chunkIndex);
        const price = prices.getNearest(date, chunk.asset, unit) || "0";
        const income = math.mul(chunk.amount, price);
        return {
          date: date,
          taxYear,
          action: TaxActions.Income,
          amount: chunk.amount,
          asset: chunk.asset,
          price: price,
          value: income,
          receivePrice: price,
          receiveDate: date,
          capitalChange: "0.00",
          tag,
          txId,
        };
      }));

    } else if (evt.type === TaxActions.Expense) {
      if (!evt.outputs) { console.warn(`Missing ${evt.type} outputs`, evt); continue; }
      rows.push(...evt.outputs.map(chunkIndex => {
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
        // do we need to add tag based on the recipient of this expense?
        // eg if it's an expense to coinbase, then tag it as an exchange fee
        return {
          date: date,
          taxYear,
          action: TaxActions.Expense,
          amount: chunk.amount,
          asset: chunk.asset,
          price: price,
          value: value,
          receivePrice: receivePrice,
          receiveDate,
          capitalChange,
          tag,
          txId,
        };
      }));
    }

    await new Promise(res => setTimeout(res, 1)); // yield to prevent hanging
  }

  // Consolidate rows with the same txId, date & recieve date
  return rows.reduce((rows, row) => {
    const dupRow = rows.find(r =>
      r.asset === row.asset
      && r.date === row.date
      && r.receiveDate === row.receiveDate
      && r.txId === row.txId
    );
    if (dupRow) {
      dupRow.amount = math.add(dupRow.amount, row.amount);
      dupRow.value = math.add(dupRow.value, row.value);
    } else {
      rows.push(row);
    }
    return rows;

  // Filter out any rows that only contain dust
  }, [] as TaxRows).filter(row =>
    math.gt(row.value, "0.005")
    && (
      row.action !== TaxActions.Trade || math.gt(row.capitalChange, "0.005")
    )
  );
};
