const Apps = {
  CryptoKitties: "CryptoKitties",
} as const;

const Methods = {
  Auction: "Auction",
  GiveBirth: "GiveBirth",
  GetBirth: "GetBirth",
  Breed: "Breed",
  Cancel: "Cancel",
  Purchase: "Purchase",
  Sale: "Sale",
  Sire: "Sire",
} as const;

const Tokens = {
} as const;

export const enums = { Apps, Methods, Tokens };
