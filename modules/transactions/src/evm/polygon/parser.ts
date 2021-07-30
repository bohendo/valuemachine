import {
  AddressBook,
  Assets,
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
): Transaction =>
  parseEvmTx(
    polygonTx,
    addressBook,
    logger,
    Assets.MATIC,
    [erc20Parser, quickswapParser, aaveParser],
  );
