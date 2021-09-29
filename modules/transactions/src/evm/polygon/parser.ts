import {
  AddressBook,
  EvmParsers,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
} from "@valuemachine/types";

import {
  aaveParsers,
  wethParsers,
  tokensParsers,
  quickswapParsers,
} from "../apps";
import { parseEvmTx } from "../parser";

export const parsePolygonTx = (
  polygonTx: EvmTransaction,
  polygonMetadata: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
  extraParsers = { insert: [], modify: [] } as EvmParsers,
): Transaction =>
  parseEvmTx(
    polygonTx,
    polygonMetadata,
    addressBook,
    logger,
    [
      aaveParsers,
      tokensParsers,
      extraParsers,
      quickswapParsers,
      wethParsers,
    ],
  );
