import { Static, Type } from "@sinclair/typebox";

import { Asset, DateString, DecString } from "./strings";
import { EventType } from "./vm";

export const FieldTypes = {
  String: "String",
  Boolean: "Boolean",
} as const;
export const FieldType = Type.Enum(FieldTypes);
export type FieldType = Static<typeof FieldType>;

export const Mapping = Type.Array(Type.Union([
  Type.Object({
    nickname: Type.String(),
    fieldType: Type.Literal(FieldTypes.String),
    fieldName: Type.String(),
  }),
  Type.Object({
    nickname: Type.String(),
    fieldType: Type.Literal(FieldTypes.Boolean),
    fieldName: Type.String(),
    checkmark: Type.String(), // value needed to check the checkbox
  }),
]));
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
});
export type TaxRow = Static<typeof TaxRow>;

export const TaxInput = Type.Object({
  FirstName: Type.Optional(Type.String()),
  MiddleInitial: Type.Optional(Type.String()),
  LastName: Type.Optional(Type.String()),
  SSN: Type.Optional(Type.String()),
  SpouseFirstName: Type.Optional(Type.String()),
  SpouseMiddleInitial: Type.Optional(Type.String()),
  SpouseLastName: Type.Optional(Type.String()),
  SpouseSSN: Type.Optional(Type.String()),
});
export type TaxInput = Static<typeof TaxInput>;
