import { Blockchains, Fiat } from "./assets";
import { enumify } from "./utils";

export const SecurityProviders = enumify({
  Unknown: "Unknown",
  ...Blockchains,
  ...Fiat,
});
export type SecurityProvider = (typeof SecurityProviders)[keyof typeof SecurityProviders];

export type Taxes = {
  income: any[],
  capital: any[],
};
