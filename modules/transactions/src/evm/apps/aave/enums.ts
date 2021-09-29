const Apps = {
  Aave: "Aave",
} as const;

const Methods = {
  Deposit: "Deposit",
  Withdraw: "Withdraw",
  Stake: "Stake",
  Unstake: "Unstake",
} as const;

const Tokens = {
  // Gov tokens
  AAVE: "AAVE",
  stkAAVE: "stkAAVE",
  // Ethereum markets
  aAAVE: "aAAVE",
  aBAL: "aBAL",
  aBAT: "aBAT",
  aBUSD: "aBUSD",
  aCRV: "aCRV",
  aDAI: "aDAI",
  aENJ: "aENJ",
  aGUSD: "aGUSD",
  aKNC: "aKNC",
  aLINK: "aLINK",
  aMANA: "aMANA",
  aMKR: "aMKR",
  aRAI: "aRAI",
  aREN: "aREN",
  aRENFIL: "aRENFIL",
  aSNX: "aSNX",
  aSUSD: "aSUSD",
  aTUSD: "aTUSD",
  aUSDC: "aUSDC",
  aUSDT: "aUSDT",
  aWBTC: "aWBTC",
  aWETH: "aWETH",
  aXSUSHI: "aXSUSHI",
  aYFI: "aYFI",
  aZRX: "aZRX",
  // Polygon markets
  amAAVE: "amAAVE",
  amDAI: "amDAI",
  amMATIC: "amMATIC",
  amUSDC: "amUSDC",
  amUSDT: "amUSDT",
  amWBTC: "amWBTC",
  amWETH: "amWETH",
} as const;

export const enums = { Apps, Methods, Tokens };
