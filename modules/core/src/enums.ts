// stolen from https://github.com/microsoft/TypeScript/issues/3192#issuecomment-261720275
export const enumify = <
  T extends {[index: string]: U},
  U extends string
>(x: T): T => x;

export const AddressCategories = enumify({
  erc20: "erc20",
  family: "family",
  friend: "friend",
  private: "private",
  public: "public",
  self: "self",
});
export type AddressCategories = (typeof AddressCategories)[keyof typeof AddressCategories];

export const AddressTags = enumify({
  cdp: "cdp",
  defi: "defi",
  ignore: "ignore",
});
export type AddressTags = (typeof AddressTags)[keyof typeof AddressTags];

export const CachedTypes = enumify({
  ChainData: "ChainData",
  Events: "Events",
  Logs: "Logs",
  Prices: "Prices",
  State: "State",
});
export type CachedTypes = (typeof CachedTypes)[keyof typeof CachedTypes];

export const Modes = enumify({
  example: "example",
  personal: "personal",
  test: "test",
});
export type Modes = (typeof Modes)[keyof typeof Modes];
