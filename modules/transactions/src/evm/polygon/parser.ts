import {
  AddressBook,
  EvmParser,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
} from "@valuemachine/types";

import { aaveParsers, erc20Parsers, quickswapParsers } from "../apps";
import { parseEvmTx } from "../parser";

export const parsePolygonTx = (
  polygonTx: EvmTransaction,
  polygonMetadata: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
  extraParsers = [] as EvmParser[],
): Transaction =>
  parseEvmTx(
    polygonTx,
    polygonMetadata,
    addressBook,
    logger,
    [ // Order matters! Complex parsers usually depend on simple ones so put ERC20 first
      erc20Parsers,
      quickswapParsers,
      aaveParsers,
      extraParsers,
    ],
  );
