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
  erc20Parsers,
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
      erc20Parsers,
      extraParsers,
      quickswapParsers,
      wethParsers,
    ],
  );
