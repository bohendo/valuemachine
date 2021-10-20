import { MaxUint256 } from "@ethersproject/constants";
import {
  EventTypes,
  Guard,
  GuardChangeEvent,
  Prices,
  TaxRow,
  TimestampString,
  TradeEvent,
  ValueMachine,
} from "@valuemachine/types";
import {
  add,
  getLogger,
  lt,
  mul,
  round,
  sub,
} from "@valuemachine/utils";

import { allTaxYears, securityFeeMap, taxYearMap } from "./constants";

export const logger = getLogger("info");

export const getIncomeTax = (taxableIncome: string, filingStatus: string): string => {
  const inf = MaxUint256.toString();
  const taxBrackets19 = [ // These should be updated to 2020 values
    { rate: "0.10", single: "9700",   joint: "19400",  head: "13850" },
    { rate: "0.12", single: "39475",  joint: "78950",  head: "52850" },
    { rate: "0.22", single: "84200",  joint: "168400", head: "84200" },
    { rate: "0.24", single: "160725", joint: "321450", head: "160700" },
    { rate: "0.32", single: "204100", joint: "408200", head: "204100" },
    { rate: "0.35", single: "510300", joint: "612350", head: "510300" },
    { rate: "0.37", single: inf, joint: inf, head: inf },
  ];
  let incomeTax = "0";
  let prevThreshold = "0";
  taxBrackets19.forEach(bracket => {
    const threshold = bracket[filingStatus];
    if (lt(taxableIncome, prevThreshold)) {
      return;
    } else if (lt(taxableIncome, threshold)) {
      incomeTax = add(
        incomeTax,
        mul(
          bracket.rate,
          sub(taxableIncome, prevThreshold),
        ),
      );
    } else {
      incomeTax = add(
        incomeTax,
        mul(
          bracket.rate,
          sub(threshold, prevThreshold),
        ),
      );
    }
    prevThreshold = threshold;
  });
  return incomeTax;
};

export const toFormDate = (date: TimestampString): string => {
  const pieces = date.split("T")[0].split("-");
  return `${pieces[1]}, ${pieces[2]}, ${pieces[0]}`;
};

export const emptyForm = (form): any => {
  const emptyForm = JSON.parse(JSON.stringify(form));
  for (const key of Object.keys(emptyForm)) {
    emptyForm[key] = "";
  }
  return emptyForm;
};

// Replace any values in "form" with "values"
export const mergeForms = (form, values): any => {
  const newForm = JSON.parse(JSON.stringify(form));
  for (const key of Object.keys(newForm)) {
    if (values && values[key]) {
      newForm[key] = values[key];
    }
  }
  return newForm;
};

export const translate = (form, mappings): any => {
  const newForm = {};
  for (const [key, value] of Object.entries(form)) {
    if (key === "default") { continue; }
    if (!mappings[key]) {
      logger.child({ module: "TranslateForms" }).warn(
        `Key ${key} exists in output data but not in mappings`
      );
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

export const getTaxYearBoundaries = (guard: Guard, taxYear: string): [number, number] => {
  if (!taxYear?.match(/^[0-9]{4}$/)) return [0, 5000000000000]; // from 1970 until after 2100
  const prevYear = round(sub(taxYear, "1"), 0).padStart(4, "0");
  console.log(`taxYear=${taxYear} | prevYear=${prevYear}`);
  return taxYearMap[guard] ? [
    new Date(taxYearMap[guard].replace(/^0000/, prevYear)).getTime(),
    new Date(taxYearMap[guard].replace(/^0000/, taxYear)).getTime(),
  ] : [
    new Date(taxYearMap.default.replace(/^0000/, prevYear)).getTime(),
    new Date(taxYearMap.default.replace(/^0000/, taxYear)).getTime(),
  ];
};

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
  const taxYearBoundaries = getTaxYearBoundaries(guard, taxYear);
  if (!unit) throw new Error(`Security asset is unknown for ${guard}`);
  let cumulativeIncome = "0";
  let cumulativeChange = "0";

  return vm?.json?.events.filter(evt => {
    const time = new Date(evt.date).getTime();
    if (taxYear && taxYear !== allTaxYears && (
      time < taxYearBoundaries[0] || time > taxYearBoundaries[1]
    )) return false;
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
