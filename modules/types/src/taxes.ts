import { Asset, DateString, DecimalString } from "./strings";

export type TaxRow = {
  date: DateString;
  action: string;
  amount: DecimalString;
  asset: Asset;
  price: DecimalString;
  value: DecimalString;
  receiveDate: DateString;
  receivePrice: DecimalString;
  capitalChange: DecimalString;
  cumulativeChange: DecimalString;
  cumulativeIncome: DecimalString;
};