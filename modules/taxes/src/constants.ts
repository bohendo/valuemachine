import {
  Assets,
  Guards,
} from "@valuemachine/transactions";

export const allTaxYears = "all";

// Every guard has exactly one special asset that it uses to accept security fees aka taxes
export const securityFeeMap = {
  [Guards.Bitcoin]: Assets.BTC,
  [Guards.BitcoinCash]: Assets.BCH,
  [Guards.Ethereum]: Assets.ETH,
  [Guards.EthereumClassic]: Assets.ETC,
  [Guards.Litecoin]: Assets.LTC,
  [Guards.Polygon]: Assets.MATIC,
  [Guards.CZE]: Assets.CZK,
  [Guards.EST]: Assets.EUR,
  [Guards.GBR]: Assets.GBP,
  [Guards.IND]: Assets.INR,
  [Guards.ROU]: Assets.EUR,
  [Guards.USA]: Assets.USD,
} as const;

export const taxYearMap = {
  default: "0000-12-31T23:59:59.999Z",
  [Guards.USA]: "0000-12-31T23:59:59.999Z",
  [Guards.IND]: "0000-03-31T23:59:59.999Z",
};
