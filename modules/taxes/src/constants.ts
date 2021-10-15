import {
  Assets,
  Guards,
} from "@valuemachine/transactions";

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

export const taxYearBoundaryMap = {
  [Guards.USA]: "0000-01-01T00:00:00Z",
  [Guards.IND]: "0000-04-01T00:00:00Z",
};
