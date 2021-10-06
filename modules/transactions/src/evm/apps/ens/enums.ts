const Apps = {
  ENS: "ENS",
} as const;

const Methods = {
  Auction: "Auction",
  Bid: "Bid",
  Commit: "Commit",
  Release: "Release",
  Invalidation: "Invalidation",
  Migration: "Migration",
  Deposit: "Deposit",
  Registration: "Registration",
  Renewal: "Renewal",
  Reveal: "Reveal",
} as const;

const Tokens = {
} as const;

export const enums = { Apps, Methods, Tokens };
