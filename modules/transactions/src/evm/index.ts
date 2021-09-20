import { addresses } from "./apps";

export { EvmAssets, EvmApps, EvmNames } from "./enums";
export { parseEvmTx } from "./parser";
export { getEtherscanData, getAlchemyData } from "./ethereum";
export { getPolygonData } from "./polygon";

export const publicAddresses = addresses;
