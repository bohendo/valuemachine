import { aaveAddresses, aaveParser } from "./aave";
import { argentAddresses, argentParser } from "./argent";
import { compoundAddresses, compoundParser } from "./compound";
import { erc20Addresses, erc20Parser } from "./erc20";
import { etherdeltaAddresses, etherdeltaParser } from "./etherdelta";
import { idleAddresses, idleParser } from "./idle";
import { makerAddresses, makerParser } from "./maker";
import { oasisAddresses, oasisParser } from "./oasis";
import { polygonAddresses, polygonParser } from "./polygon";
import { tornadoAddresses, tornadoParser } from "./tornado";
import { uniswapAddresses, uniswapParser } from "./uniswap";
import { uniswapv3Addresses, uniswapv3Parser } from "./uniswapv3";
import { wethAddresses, wethParser } from "./weth";
import { yearnAddresses, yearnParser } from "./yearn";

export const appAddresses = [
  ...aaveAddresses,
  ...argentAddresses,
  ...compoundAddresses,
  ...etherdeltaAddresses,
  ...idleAddresses,
  ...erc20Addresses,
  ...makerAddresses,
  ...oasisAddresses,
  ...polygonAddresses,
  ...tornadoAddresses,
  ...uniswapAddresses,
  ...uniswapv3Addresses,
  ...wethAddresses,
  ...yearnAddresses,
];

// Order matters!
// Complex parsers usually depend on simple ones so put ERC20 & weth first
export const appParsers = [
  erc20Parser,
  wethParser,
  oasisParser,
  polygonParser,
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
];
