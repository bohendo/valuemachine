import { Static } from "@sinclair/typebox";

import { enumToSchema } from "./utils";

// Security providers on the internet
export const DigitalGuardians = {
  BCH: "BCH",
  BTC: "BTC",
  ETH: "ETH",
  LTC: "LTC",
} as const;
export const DigitalGuardianSchema = enumToSchema(DigitalGuardians);
export type DigitalGuardians = Static<typeof DigitalGuardianSchema>;
export type DigitalGuardian = (typeof DigitalGuardians)[keyof typeof DigitalGuardians];

// Security providers in the physical world
export const PhysicalGuardians = {
  CZK: "CZK",
  EUR: "EUR",
  GBP: "GBP",
  INR: "INR",
  USD: "USD",
} as const;
export const PhysicalGuardianSchema = enumToSchema(PhysicalGuardians);
export type PhysicalGuardians = Static<typeof PhysicalGuardianSchema>;
export type PhysicalGuardian = (typeof PhysicalGuardians)[keyof typeof PhysicalGuardians];

export const SecurityProviders = {
  ...DigitalGuardians,
  ...PhysicalGuardians,
  None: "None",
} as const;
export const SecurityProviderSchema = enumToSchema(SecurityProviders);
export type SecurityProviders = Static<typeof SecurityProviderSchema>;
export type SecurityProvider = (typeof SecurityProviders)[keyof typeof SecurityProviders];
