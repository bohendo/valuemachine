import { Static, Type } from "@sinclair/typebox";

import { Asset, DateString, DecString } from "./strings";
import { EventType } from "./vm";

export const Mapping = Type.Array(Type.Object({
  nickname: Type.String(),
  fieldName: Type.String(),
  checkmark: Type.Optional(Type.String()), // value needed to check the checkbox
}, { additionalProperties: false }));
export type Mapping = Static<typeof Mapping>;

export const TaxRow = Type.Object({
  date: DateString,
  action: EventType, // subset: Trade or Income
  amount: DecString,
  asset: Asset,
  price: DecString,
  tags: Type.Array(Type.String()),
  value: DecString,
  receiveDate: DateString,
  receivePrice: DecString,
  capitalChange: DecString,
  cumulativeChange: DecString,
  cumulativeIncome: DecString,
}, { additionalProperties: false });
export type TaxRow = Static<typeof TaxRow>;

export const TaxInput = Type.Object({
  personal: Type.Optional(Type.Object({
    filingStatus: Type.Optional(Type.String()), // use enum instead of string?
    firstName: Type.Optional(Type.String()),
    middleInitial: Type.Optional(Type.String()),
    lastName: Type.Optional(Type.String()),
    SSN: Type.Optional(Type.String()),
    spouseFirstName: Type.Optional(Type.String()),
    spouseMiddleInitial: Type.Optional(Type.String()),
    spouseLastName: Type.Optional(Type.String()),
    spouseSSN: Type.Optional(Type.String()),
    occupation: Type.Optional(Type.String()),
    spouseOccupation: Type.Optional(Type.String()),
  }, { additionalProperties: false })),
  // If >300 days of tax year was outside the US, insert f2555
  travel: Type.Optional(Type.Array(Type.Object({
    enterDate: DateString,
    leaveDate: DateString,
    country: Type.String(), // 3-letter code a la ISO 3166-1 alpha-3
    usaIncomeEarned: DecString,
  }, { additionalProperties: false }))),
  // If business info provided, insert f1040sc & f1040sse else treat all income as wages
  business: Type.Optional(Type.Object({
    name: Type.String(),
    industry: Type.String(),
    street: Type.String(),
    city: Type.String(),
    state: Type.String(),
    zip: Type.String(),
    code: Type.String(),
    eid: Type.String(),
    accountingMethod: Type.String(),
  }, { additionalProperties: false })),
  forms: Type.Optional(Type.Record(
    Type.String(),
    Type.Record(
      Type.String(),
      Type.Any(), // either string or bool but we can't know which until we parse mappings
    ),
  )),
}, { additionalProperties: false });
export type TaxInput = Static<typeof TaxInput>;
