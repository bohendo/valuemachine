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
  airswapParsers,
  bjtjParsers,
  argentParsers,
  compoundParsers,
  cryptokittiesParsers,
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

export const parseEthereumTx = (
  ethTx: EvmTransaction,
  ethMetadata: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
  extraParsers = { insert: [], modify: [] } as EvmParsers,
): Transaction =>
  parseEvmTx(
    ethTx,
    ethMetadata,
    addressBook,
    logger,
    [
      aaveParsers,
      airswapParsers,
      bjtjParsers,
      argentParsers,
      compoundParsers,
      cryptokittiesParsers,
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
