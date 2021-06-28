import { Static, Type } from "@sinclair/typebox";

// Security providers on the internet
export const DigitalGuardians = {
  BCH: "BCH",
  BTC: "BTC",
  ETH: "ETH",
  LTC: "LTC",
} as const;
export const DigitalGuardian = Type.Enum(DigitalGuardians);
export type DigitalGuardian = Static<typeof DigitalGuardian>;

// Security providers in the physical world
export const PhysicalGuardians = {
  CZK: "CZK",
  EUR: "EUR",
  GBP: "GBP",
  INR: "INR",
  USD: "USD",
} as const;
export const PhysicalGuardian = Type.Enum(PhysicalGuardians);
export type PhysicalGuardian = Static<typeof PhysicalGuardian>;

export const SecurityProviders = {
  ...DigitalGuardians,
  ...PhysicalGuardians,
  None: "None",
} as const;
export const SecurityProvider = Type.Enum(SecurityProviders);
export type SecurityProvider = Static<typeof SecurityProvider>;
