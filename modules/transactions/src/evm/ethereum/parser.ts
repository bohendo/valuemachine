import {
  AddressBook,
  Assets,
  EvmParser,
  Evms,
  EvmTransaction,
  EvmTransfer,
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
  ethTransfers: EvmTransfer[],
  addressBook: AddressBook,
  logger: Logger,
  extraParsers?: EvmParser[],
): Transaction =>
  parseEvmTx(
    ethTx,
    ethTransfers,
    addressBook,
    logger,
    1,
    Evms.Ethereum,
    Assets.ETH,
    [ // Order matters! Complex parsers usually depend on simple ones so put ERC20 & weth first
      erc20Parser,
      wethParser,
      oasisParser,
      polygonParser,
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
      argentParser,
    ].concat(extraParsers || []),
  );
