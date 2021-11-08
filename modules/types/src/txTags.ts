import { Static, Type } from "@sinclair/typebox";

import {
  Guard,
  DecString,
  TxId,
} from "./strings";

export const IncomeTypes = {
  Airdrop: "Airdrop",
  Dividend: "Dividend",
  Interest: "Interest",
  Prize: "Prize",
  SelfEmployed: "SelfEmployed",
  Wage: "Wage",
} as const;
export const IncomeType = Type.Enum(IncomeTypes); // NOT Extensible at run-time
export type IncomeType = Static<typeof IncomeType>;

// Eg for filling in f1040sc part II
export const ExpenseTypes = {
  Business: "Business",
  Fee: "Fee",
  Tax: "Tax",
} as const;
export const ExpenseType = Type.Enum(ExpenseTypes); // NOT Extensible at run-time
export type ExpenseType = Static<typeof ExpenseType>;

export const TxTagTypes = {
  description: "description",
  expenseType: "expenseType",
  incomeType: "incomeType",
  multiplier: "multiplier",
  physicalGuard: "physicalGuard",
} as const;
export const TxTagType = Type.Enum(TxTagTypes); // NOT Extensible at run-time
export type TxTagType = Static<typeof TxTagType>;

export const Tag = Type.Object({
  description: Type.Optional(Type.String()),
  expenseType: Type.Optional(Type.String()),
  incomeType: Type.Optional(Type.String()),
  multiplier: Type.Optional(DecString),
  physicalGuard: Type.Optional(Guard),
});
export type Tag = Static<typeof Tag>;

export const TxTags = Type.Record(TxId, Tag);
export type TxTags = Static<typeof TxTags>;
