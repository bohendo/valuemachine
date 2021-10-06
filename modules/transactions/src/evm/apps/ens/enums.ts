const Apps = {
  ENS: "ENS",
} as const;

const Methods = {
  Auction: "Auction",
  Commit: "Commit",
  Configuration: "Configuration",
  Invalidation: "Invalidation",
  Migration: "Migration",
  Registration: "Registration",
  Release: "Release",
  Renewal: "Renewal",
  Reveal: "Reveal",
} as const;

const Tokens = {
} as const;

export const enums = { Apps, Methods, Tokens };
