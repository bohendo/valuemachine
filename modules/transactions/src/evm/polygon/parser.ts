import {
  AddressBook,
  Assets,
  EvmParser,
  Evms,
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
    [], // EvmTransfers are not available for polygon
    addressBook,
    logger,
    137,
    Evms.Polygon,
    Assets.MATIC,
    [ // Order matters! Complex parsers usually depend on simple ones so put ERC20 first
      erc20Parser,
      quickswapParser,
      aaveParser,
    ].concat(extraParsers || []),
  );
