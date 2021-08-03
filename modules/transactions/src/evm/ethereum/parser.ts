import {
  AddressBook,
  EvmParser,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
} from "@valuemachine/types";

import {
  aaveParser,
  argentParser,
  compoundParser,
  erc20Parser,
  etherdeltaParser,
  idleParser,
  makerParser,
  oasisParser,
  polygonParser,
  quickswapParser,
  tornadoParser,
  uniswapParser,
  uniswapv3Parser,
  wethParser,
  yearnParser,
} from "../apps";
import { parseEvmTx } from "../parser";

export const parseEthTx = (
  ethTx: EvmTransaction,
  ethMetadata: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
  extraParsers?: EvmParser[],
): Transaction =>
  parseEvmTx(
    ethTx,
    ethMetadata,
    addressBook,
    logger,
    [ // Order matters! Complex parsers usually depend on simple ones so put ERC20 & weth first
      erc20Parser,
      wethParser,
      oasisParser,
      quickswapParser,
      makerParser,
      compoundParser,
      aaveParser,
      etherdeltaParser,
      uniswapParser,
      uniswapv3Parser,
      idleParser,
      yearnParser,
      tornadoParser,
      polygonParser,
      argentParser,
    ].concat(extraParsers || []),
  );
