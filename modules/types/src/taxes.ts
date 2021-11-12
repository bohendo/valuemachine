import { Static, Type } from "@sinclair/typebox";

import { Asset, DateString, DecString, TxId } from "./strings";
import { Tag } from "./txTags";

export const FilingStatuses = {
  Head: "Head",
  Joint: "Joint",
  Separate: "Separate",
  Single: "Single",
  Widow: "Widow",
} as const;
export const FilingStatus = Type.Enum(FilingStatuses);
export type FilingStatus = Static<typeof FilingStatus>;

export const Mapping = Type.Array(Type.Object({
  nickname: Type.String(),
  fieldName: Type.String(),
  checkmark: Type.Optional(Type.String()), // value needed to check the checkbox
}, { additionalProperties: false }));
export type Mapping = Static<typeof Mapping>;

export const TaxActions = {
  Income: "Income",
  Trade: "Trade",
  Expense: "Expense",
} as const;
export const TaxAction = Type.Enum(TaxActions); // NOT Extensible
export type TaxAction = Static<typeof TaxAction>;

export const TaxRow = Type.Object({
  date: DateString,
  action: TaxAction, // subset: Trade or Income
  amount: DecString, // rounded to 10^-6
  asset: Asset,
  price: DecString, // rounded to 10^-4
  tag: Tag,
  value: DecString, // rounded to 10^-2
  txId: TxId,
  receiveDate: DateString,
  receivePrice: DecString, // rounded to 10^-4
  capitalChange: DecString, // rounded to 10^-2
}, { additionalProperties: false });
export type TaxRow = Static<typeof TaxRow>;

export const TaxInput = Type.Object({
  personal: Type.Optional(Type.Object({
    filingStatus: Type.Optional(FilingStatus), // use enum instead of string?
    firstName: Type.Optional(Type.String()),
    middleInitial: Type.Optional(Type.String()),
    lastName: Type.Optional(Type.String()),
    SSN: Type.Optional(Type.String()),
    spouseFirstName: Type.Optional(Type.String()),
    spouseMiddleInitial: Type.Optional(Type.String()),
    spouseLastName: Type.Optional(Type.String()),
    spouseSSN: Type.Optional(Type.String()),
    streetAddress: Type.Optional(Type.String()),
    apt: Type.Optional(Type.String()),
    city: Type.Optional(Type.String()),
    state: Type.Optional(Type.String()),
    zip: Type.Optional(Type.String()),
    foreignCountry: Type.Optional(Type.String()),
    foreignState: Type.Optional(Type.String()),
    foreignZip: Type.Optional(Type.String()),
    occupation: Type.Optional(Type.String()),
    pin: Type.Optional(Type.String()),
    spouseOccupation: Type.Optional(Type.String()),
    spousePin: Type.Optional(Type.String()),
    phone: Type.Optional(Type.String()),
    email: Type.Optional(Type.String()),
    employer: Type.Optional(Type.Object({
      name: Type.Optional(Type.String()),
      street: Type.Optional(Type.String()),
      state: Type.Optional(Type.String()),
      country: Type.Optional(Type.String()),
      phone: Type.Optional(Type.String()),
      pin: Type.Optional(Type.String()),
      type: Type.Optional(Type.String()),
    })),
    thirdParty: Type.Optional(Type.Object({
      name: Type.Optional(Type.String()),
      phone: Type.Optional(Type.String()),
      pin: Type.Optional(Type.String()),
    })),
    preparer: Type.Optional(Type.Object({
      name: Type.Optional(Type.String()),
      ptin: Type.Optional(Type.String()),
      isSelfEmployed: Type.Optional(Type.Boolean()),
      firmName: Type.Optional(Type.String()),
      firmAddress: Type.Optional(Type.String()),
      firmEIN: Type.Optional(Type.String()),
      phone: Type.Optional(Type.String()),
    })),
  }, { additionalProperties: false })),
  // If >300 days of tax year was outside the US, insert f2555
  travel: Type.Optional(Type.Array(Type.Object({
    enterDate: DateString,
    leaveDate: DateString,
    country: Type.String(), // 3-letter code a la ISO 3166-1 alpha-3
    usaIncomeEarned: Type.Optional(DecString),
  }, { additionalProperties: false }))),
  // If business info provided, insert f1040sc & f1040sse else treat all income as wages
  business: Type.Optional(Type.Object({
    name: Type.Optional(Type.String()),
    industry: Type.Optional(Type.String()),
    street: Type.Optional(Type.String()),
    city: Type.Optional(Type.String()),
    state: Type.Optional(Type.String()),
    zip: Type.Optional(Type.String()),
    code: Type.Optional(Type.String()),
    eid: Type.Optional(Type.String()),
    accountingMethod: Type.Optional(Type.String()),
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
