const Apps = {
  NFT: "NFT",
  ENS: "ENS",
  Urbit: "Urbit",
} as const;

const Methods = {
  Transfer: "Transfer",
  Approve: "Approve",
} as const;

const Tokens = {
} as const;

export const enums = { Apps, Methods, Tokens };
