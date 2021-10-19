const Apps = {
  EtherDelta: "EtherDelta",
} as const;

const Methods = {
  Deposit: "Deposit",
  Withdraw: "Withdraw",
} as const;

const Tokens = {} as const;

export const enums = { Apps, Methods, Tokens };
