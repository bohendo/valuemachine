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
export {
  EvmAddress,
  EvmData,
  EvmDataJson,
  EvmDataParams,
  EvmMetadata,
  EvmParser,
  EvmParsers,
  EvmTransaction,
  EvmTransactionLog,
  EvmTransfer,
} from "./types";
export { 
  getEmptyEvmData,
  getEvmDataError,
  getEvmTransactionError,
  getNewContractAddress,
} from "./utils";

export const publicAddresses = addresses;
