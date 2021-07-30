import {
  AddressBook,
  Assets,
  EvmTransaction,
  Logger,
  Transaction,
} from "@valuemachine/types";

import { parseEvmTx } from "../evmParser";

import { erc20Parser } from "./erc20";
//import { aaveParser } from "./aave";
import { quickswapParser } from "./quickswap";

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
    [erc20Parser, quickswapParser],
  );
