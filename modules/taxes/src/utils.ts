import {
  EventTypes,
  Guard,
  GuardChangeEvent,
  Prices,
  TaxRow,
  TradeEvent,
  ValueMachine,
} from "@valuemachine/types";
import {
  add,
  mul,
  sub,
} from "@valuemachine/utils";

import { securityFeeMap } from "./constants";

export const getTaxRows = ({
  guard,
  prices,
  vm,
  taxYear,
}: {
  guard: Guard;
  prices: Prices;
  vm: ValueMachine;
  taxYear?: string;
}): TaxRow[] => {
  const unit = securityFeeMap[guard] || "";
  if (!unit) throw new Error(`Security asset is unknown for ${guard}`);
  let cumulativeIncome = "0";
  let cumulativeChange = "0";

  return vm?.json?.events.filter(evt => {
    if (taxYear && taxYear !== "all" && !evt.date.startsWith(taxYear)) return false;
    const toGuard = (
      (evt as GuardChangeEvent).to || (evt as TradeEvent).account || ""
    ).split("/")[0];
    return toGuard === guard && (
      evt.type === EventTypes.Trade
      || evt.type === EventTypes.GuardChange
      || evt.type === EventTypes.Income
    );
  }).reduce((output, evt) => {
    const date = evt.date || new Date().toISOString();

    if (evt.type === EventTypes.Trade) {
      if (!evt.outputs) { console.warn(`Missing ${evt.type} outputs`, evt); return output; }
      return output.concat(...evt.outputs.map(chunkIndex => {
        const chunk = vm.getChunk(chunkIndex);
        const price = prices.getNearest(date, chunk.asset, unit) || "0";
        if (chunk.asset !== unit && price !== "0") {
          const value = mul(chunk.amount, price);
          const receivePrice = prices.getNearest(chunk.history[0]?.date, chunk.asset, unit);
          const capitalChange = mul(chunk.amount, sub(price, receivePrice || "0"));
          cumulativeChange = add(cumulativeChange, capitalChange);
          return {
            date: date,
            action: EventTypes.Trade,
            amount: chunk.amount,
            asset: chunk.asset,
            price,
            value,
            receivePrice,
            receiveDate: chunk.history[0].date,
            capitalChange,
            cumulativeChange,
            cumulativeIncome,
          };
        } else {
          return null;
        }
      }).filter(row => !!row) as TaxRow[]);

    } else if (evt.type === EventTypes.Income) {
      if (!evt.inputs) { console.warn(`Missing ${evt.type} inputs`, evt); return output; }
      return output.concat(...evt.inputs.map(chunkIndex => {
        const chunk = vm.getChunk(chunkIndex);
        const price = prices.getNearest(date, chunk.asset, unit) || "0";
        const income = mul(chunk.amount, price);
        cumulativeIncome = add(cumulativeIncome, income);
        return {
          date: date,
          action: EventTypes.Income,
          amount: chunk.amount,
          asset: chunk.asset,
          price,
          value: income,
          receivePrice: price,
          receiveDate: date,
          capitalChange: "0",
          cumulativeChange,
          cumulativeIncome,
        } as TaxRow;
      }));

    } else if (evt.type === EventTypes.GuardChange) {
      if (!evt.chunks) { console.warn(`Missing ${evt.type} chunks`, evt); return output; }
      return output.concat(...evt.chunks.map(chunkIndex => {
        const chunk = vm.getChunk(chunkIndex);
        const price = prices.getNearest(date, chunk.asset, unit) || "0";
        console.warn(evt, `Temporarily pretending this guard change is income`);
        const income = mul(chunk.amount, price);
        cumulativeIncome = add(cumulativeIncome, income);
        return {
          date: date,
          action: "Deposit",
          amount: chunk.amount,
          asset: chunk.asset,
          price,
          value: income,
          receivePrice: price,
          receiveDate: chunk.history[0].date,
          capitalChange: "0",
          cumulativeChange,
          cumulativeIncome,
        } as TaxRow;
      }));

    } else {
      return output;
    }
  }, [] as TaxRow[]);

};
