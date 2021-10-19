const Apps = {
  Dai: "Dai",
  DaiVat: "DaiVat",
  DSProxy: "DSProxy",
  DSR: "DSR",
  Maker: "Maker",
  Oasis: "Oasis",
  Sai: "Sai",
  SaiCage: "SaiCage",
  SaiGemPit: "SaiGemPit",
  SaiToDaiVault: "SaiToDaiVault",
  SaiTub: "SaiTub",
} as const;

const Methods = {};

const Tokens = {
  MKR: "MKR",
  SAI: "SAI",
  DAI: "DAI",
  PETH: "PETH",
} as const;

export const enums = { Apps, Methods, Tokens };
