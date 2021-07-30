import {
  AddressBook,
  Assets,
  EvmParser,
  EvmTransaction,
  Logger,
  Transaction,
} from "@valuemachine/types";

import { aaveParser, erc20Parser, quickswapParser } from "../apps";
import { parseEvmTx } from "../parser";

export const parsePolygonTx = (
  polygonTx: EvmTransaction,
  addressBook: AddressBook,
  logger: Logger,
  extraParsers?: EvmParser[],
): Transaction =>
  parseEvmTx(
    polygonTx,
    [], // No EvmTransfers are available for polygon
    addressBook,
    logger,
    Assets.MATIC,
    [ // Order matters! Complex parsers usually depend on simple ones so put ERC20 first
      erc20Parser,
      quickswapParser,
      aaveParser,
    ].concat(extraParsers || []),
  );
