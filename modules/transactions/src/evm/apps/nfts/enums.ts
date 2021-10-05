const Apps = {
  NFT: "NFT",
  ENS: "ENS",
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
