import { MaxUint256 } from "@ethersproject/constants";
import { Static, Type } from "@sinclair/typebox";
import { Guards } from "@valuemachine/transactions";
import {
  DecString,
  IntString,
  TaxRow,
  EventTypes,
  DateString,
} from "@valuemachine/types";
import { math } from "@valuemachine/utils";

export {
  TaxRow,
  Asset,
  DateString,
  DecString,
  IntString,
  EventTypes,
} from "@valuemachine/types";
export { math } from "@valuemachine/utils";

export { TaxYears } from "../mappings";

export const guard = Guards.USA;

export const maxint = MaxUint256.toString();

export const FilingStatuses = {
  Single: "Single", // single or married separate
  Joint: "Joint", // married joint or widow
  Head: "Head", // head of household
} as const;
export const FilingStatus = Type.Enum(FilingStatuses); // NOT Extensible
export type FilingStatus = Static<typeof FilingStatus>;

// ISO => "MM, DD, YY"
export const toFormDate = (date: DateString): string => {
  const pieces = date.split("T")[0].split("-");
  return `${pieces[1]}, ${pieces[2]}, ${pieces[0]}`;
};

export const getGetIncomeTax = (
  taxBrackets: Array<{ rate: DecString; single: IntString; joint: IntString; head: IntString }>,
) => (
  taxableIncome: string,
  filingStatus: FilingStatus,
): string => {
  let incomeTax = "0";
  let prevThreshold = "0";
  taxBrackets.forEach(bracket => {
    const threshold = bracket[filingStatus];
    if (math.lt(taxableIncome, prevThreshold)) {
      return;
    } else if (math.lt(taxableIncome, threshold)) {
      incomeTax = math.add(
        incomeTax,
        math.mul(
          bracket.rate,
          math.sub(taxableIncome, prevThreshold),
        ),
      );
    } else {
      incomeTax = math.add(
        incomeTax,
        math.mul(
          bracket.rate,
          math.sub(threshold, prevThreshold),
        ),
      );
    }
    prevThreshold = threshold;
  });
  return incomeTax;
};

export const processIncome = (
  taxes: TaxRow[],
  callback: (tax: TaxRow, value: string) => void,
): void => {
  taxes.filter(tax =>
    tax.action === EventTypes.Income &&
    math.gt(tax.amount, "0")
  ).forEach((income: TaxRow): void => {
    let value = math.mul(income.amount, income.price);
    if (income.tags.includes("ignore")) {
      return;
    } else if (income.tags.some(tag => tag.startsWith("multiply-"))) {
      const tag = income.tags.find(tag => tag.startsWith("multiply-"));
      const multiplier = tag.split("-")[1];
      value = math.mul(value, multiplier);
    }
    callback(income, value);
  });
};

export const processExpenses = (
  taxes: TaxRow[],
  callback: (tax: TaxRow, value: string) => void,
): void => {
  taxes.filter(tax =>
    tax.action === EventTypes.Expense &&
    math.gt(tax.amount, "0") &&
    !tax.tags.includes("ignore"),
  ).forEach((tax: TaxRow): void => {
    let value = math.round(math.mul(tax.amount, tax.price));
    if (tax.tags.some(tag => tag.startsWith("multiply-"))) {
      const tag = tax.tags.find(tag => tag.startsWith("multiply-"));
      const multiplier = tag.split("-")[1];
      value = math.mul(value, multiplier);
    }
    callback(tax, value);
  });
};
