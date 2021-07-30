import { Static, Type } from "@sinclair/typebox";

// Security providers on the internet
export const DigitalGuards = {
  BCH: "BCH",
  BTC: "BTC",
  ETH: "ETH",
  LTC: "LTC",
  MATIC: "MATIC",
} as const;
export const DigitalGuard = Type.Enum(DigitalGuards);
export type DigitalGuard = Static<typeof DigitalGuard>;

// Security providers in the physical world
export const PhysicalGuards = {
  CZK: "CZK",
  EUR: "EUR",
  GBP: "GBP",
  INR: "INR",
  USD: "USD",
} as const;
export const PhysicalGuard = Type.Enum(PhysicalGuards);
export type PhysicalGuard = Static<typeof PhysicalGuard>;

export const Guards = {
  ...DigitalGuards,
  ...PhysicalGuards,
  None: "None",
} as const;
export const Guard = Type.Union([
  Type.String(),
  Type.Enum(Guards),
]);
export type Guard = Static<typeof Guard>;
