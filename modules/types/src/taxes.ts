import { Asset, DateString, DecString } from "./strings";
import { EventType } from "./vm";

export type TaxRow = {
  date: DateString;
  action: EventType; // subset: Trade or Income
  amount: DecString;
  asset: Asset;
  price: DecString;
  tags: string[];
  value: DecString;
  receiveDate: DateString;
  receivePrice: DecString;
  capitalChange: DecString;
  cumulativeChange: DecString;
  cumulativeIncome: DecString;
};
