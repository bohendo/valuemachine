export const CsvMethods = {
  Payment: "Payment",
  Deposit: "Deposit",
  Withdraw: "Withdraw",
  Sell: "Sell",
  Buy: "Buy",
} as const;

export const CsvSources = {
  Coinbase: "Coinbase",
  DigitalOcean: "DigitalOcean",
  Elements: "Elements",
  Wyre: "Wyre",
  Wazirx: "Wazirx",
} as const;
