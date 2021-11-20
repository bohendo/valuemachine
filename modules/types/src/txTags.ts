import { Static, Type } from "@sinclair/typebox";

import {
  Guard,
  DecString,
  TxId,
} from "./strings";

export const IncomeTypes = {
  Airdrop: "Airdrop", // f1040s1.L8
  Dividend: "Dividend", // f1040.L3b
  Interest: "Interest", // f1040.L2b
  Church: "Church", // f1040sse.L5a
  Prize: "Prize", // f1040s1.L8
  Business: "Business", // f1040sc.L1
  Wage: "Wage", // f1040.L1
  IRA: "IRA", // f1040.L4b
  Pension: "Pension", // f1040.L5b
  SocialSecurity: "SocialSecurity", // f1040.L6b
  TaxCredit: "TaxCredit", // f1040s1.L1
  Unemployment: "Unemployment", // f1040s1.L7
  Alimony: "Alimony", // f1040s1.L2a
} as const;
export const IncomeType = Type.Enum(IncomeTypes); // NOT Extensible at run-time
export type IncomeType = Static<typeof IncomeType>;

// Eg for filling in f1040sc part II
export const BusinessExpenseTypes = {
  Advertising: "Advertising", // f1040sc.L8
  Vehicle: "Vehicle", // f1040sc.L9
  Commission: "Commission", // f1040sc.L10
  Labor: "Labor", // f1040sc.L11
  Depletion: "Depletion", // f1040sc.L12
  Depreciation: "Depreciation", // f1040sc.L13
  EmployeeBenefits: "EmployeeBenefits", // f1040sc.L14
  Insurance: "Insurance", // f1040sc.L15
  Mortgage: "Mortgage", // f1040sc.L16a
  Interest: "Interest", // f1040sc.L16b
  Legal: "Legal", // f1040sc.L17
  Office: "Office", // f1040sc.L18
  Pension: "Pension", // f1040sc.L19
  EquipmentRental: "EquipmentRental", // f1040sc.L20a
  PropertyRental: "PropertyRentalOffice", // f1040sc.L20b
  Repairs: "Repairs", // f1040sc.L21
  Supplies: "Supplies", // f1040sc.L22
  Licenses: "Licenses", // f1040sc.L23
  Travel: "Travel", // f1040sc.L24a
  Meals: "Meals", // f1040sc.L24b
  Utilities: "Utilities", // f1040sc.L25
  Wages: "Wages", // f1040sc.L26
  Business: "Business", // f1040sc.L48
} as const;
export const BusinessExpenseType = Type.Enum(BusinessExpenseTypes); // NOT Extensible at run-time
export type BusinessExpenseType = Static<typeof BusinessExpenseType>;

export const ExpenseTypes = {
  ...BusinessExpenseTypes,
  Tax: "Tax",
  Fee: "Fee",
  Personal: "Personal",
} as const;
export const ExpenseType = Type.Enum(ExpenseTypes); // NOT Extensible at run-time
export type ExpenseType = Static<typeof ExpenseType>;

export const TxTagTypes = {
  description: "description",
  exempt: "exempt",
  expenseType: "expenseType",
  incomeType: "incomeType",
  multiplier: "multiplier",
  physicalGuard: "physicalGuard",
} as const;
export const TxTagType = Type.Enum(TxTagTypes); // NOT Extensible at run-time
export type TxTagType = Static<typeof TxTagType>;

export const Tag = Type.Object({
  description: Type.Optional(Type.String()),
  exempt: Type.Optional(Type.Boolean()),
  expenseType: Type.Optional(Type.String()),
  incomeType: Type.Optional(Type.String()),
  multiplier: Type.Optional(DecString),
  physicalGuard: Type.Optional(Guard),
});
export type Tag = Static<typeof Tag>;

export const TxTags = Type.Record(TxId, Tag);
export type TxTags = Static<typeof TxTags>;
