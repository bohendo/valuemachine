import { PricesJson } from "@valuemachine/types";

export const getPricesError = (pricesJson: PricesJson) => 
  pricesJson ? null : "Prices json is falsy";

