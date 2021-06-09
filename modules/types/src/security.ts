import { enumify } from "./utils";

export const DigitalGuardians = enumify({
  BCH: "BCH",
  BTC: "BTC",
  ETH: "ETH",
  LTC: "LTC",
});
export type DigitalGuardian = (typeof DigitalGuardians)[keyof typeof DigitalGuardians];

export const PhysicalGuardians = enumify({
  CZK: "CZK",
  EUR: "EUR",
  GBP: "GBP",
  INR: "INR",
  USD: "USD",
});
export type PhysicalGuardian = (typeof PhysicalGuardians)[keyof typeof PhysicalGuardians];

export const SecurityProviders = enumify({
  ...DigitalGuardians,
  ...PhysicalGuardians,
  None: "None",
});
export type SecurityProvider = (typeof SecurityProviders)[keyof typeof SecurityProviders];
