import { addresses } from "./apps";

export { ethereumParsers, polygonParsers } from "./apps";
export {
  Apps as EvmApps,
  Assets as EvmAssets,
  Methods as EvmMethods,
  Evms as EvmNames,
  Tokens as EvmTokens,
} from "./enums";
export { parseEvmTx } from "./parser";
export { getEthereumData } from "./ethereum";
export { getPolygonData } from "./polygon";

export const publicAddresses = addresses;
