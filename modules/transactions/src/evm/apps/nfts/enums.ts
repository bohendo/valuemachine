const Apps = {
  NFT: "NFT",
  Urbit: "Urbit",
  OpenSea: "OpenSea",
} as const;

const Methods = {
  Transfer: "Transfer",
  Approval: "Approval",
} as const;

const Tokens = {
} as const;

export const enums = { Apps, Methods, Tokens };
