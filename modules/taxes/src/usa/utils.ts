import { TaxRow, EventTypes, TimestampString } from "@valuemachine/types";
import { getLogger, math } from "@valuemachine/utils";

export const logger = getLogger("info", "USAUtils");

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

// ISO => "MM, DD, YY"
export const toFormDate = (date: TimestampString): string => {
  const pieces = date.split("T")[0].split("-");
  return `${pieces[1]}, ${pieces[2]}, ${pieces[0]}`;
};
