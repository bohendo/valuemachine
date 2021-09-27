export const apps = {
  Zap: "Zap",
  Polygon: "Polygon",
} as const;

export const contracts = {
  FlashWallet: "FlashWallet",
  PlasmaBridge: "PlasmaBridge",
  PolygonStateSyncer: "PolygonStateSyncer",
  ZapPolygonBridge: "ZapperPolygonBridge",
};

export const assets = {} as const;

export const enums = { assets, apps, contracts };
