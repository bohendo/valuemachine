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
  argentParsers,
  compoundParsers,
  erc20Parsers,
  etherdeltaParsers,
  idleParsers,
  makerParsers,
  polygonParsers,
  quickswapParsers,
  tornadoParsers,
  uniswapParsers,
  wethParsers,
  yearnParsers,
} from "../apps";
import { parseEvmTx } from "../parser";

export const parseEthTx = (
  ethTx: EvmTransaction,
  ethMetadata: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
  extraParsers = [] as EvmParsers[],
): Transaction =>
  parseEvmTx(
    ethTx,
    ethMetadata,
    addressBook,
    logger,
    [ // Order matters! Complex parsers usually depend on simple ones so put ERC20 & weth first
      aaveParsers,
      argentParsers,
      compoundParsers,
      erc20Parsers,
      etherdeltaParsers,
      idleParsers,
      makerParsers,
      polygonParsers,
      quickswapParsers,
      tornadoParsers,
      uniswapParsers,
      wethParsers,
      yearnParsers,
      extraParsers,
    ],
  );
