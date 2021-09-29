const Apps = {
  Idle: "Idle",
} as const;

const Methods = {};

const Tokens = {
  IDLE: "IDLE",
  idleDAISafe: "idleDAISafe",
  idleDAIYield: "idleDAIYield",
  idleRAIYield: "idleRAIYield",
  idleSUSDYield: "idleSUSDYield",
  idleTUSDYield: "idleTUSDYield",
  idleUSDCSafe: "idleUSDCSafe",
  idleUSDCYield: "idleUSDCYield",
  idleUSDTSafe: "idleUSDTSafe",
  idleUSDTYield: "idleUSDTYield",
  idleWBTCYield: "idleWBTCYield",
  idleWETHYield: "idleWETHYield",
} as const;

export const enums = { Apps, Methods, Tokens };
