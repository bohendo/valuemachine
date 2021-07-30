import { aaveAddresses, aaveParser } from "./aave";
import { argentAddresses, argentParser } from "./argent";
import { compoundAddresses, compoundParser } from "./compound";
import { erc20Addresses, erc20Parser } from "./erc20";
import { etherdeltaAddresses, etherdeltaParser } from "./etherdelta";
import { idleAddresses, idleParser } from "./idle";
import { makerAddresses, makerParser } from "./maker";
import { oasisAddresses, oasisParser } from "./oasis";
import { polygonAddresses, polygonParser } from "./polygon";
import { quickswapAddresses, quickswapParser } from "./quickswap";
import { tornadoAddresses, tornadoParser } from "./tornado";
import { uniswapAddresses, uniswapParser } from "./uniswap";
import { uniswapv3Addresses, uniswapv3Parser } from "./uniswapv3";
import { wethAddresses, wethParser } from "./weth";
import { yearnAddresses, yearnParser } from "./yearn";

export { aaveParser } from "./aave";
export { argentParser } from "./argent";
export { compoundParser } from "./compound";
export { erc20Parser } from "./erc20";
export { etherdeltaParser } from "./etherdelta";
export { idleParser } from "./idle";
export { makerParser } from "./maker";
export { oasisParser } from "./oasis";
export { polygonParser } from "./polygon";
export { quickswapParser } from "./quickswap";
export { tornadoParser } from "./tornado";
export { uniswapParser } from "./uniswap";
export { uniswapv3Parser } from "./uniswapv3";
export { wethParser } from "./weth";
export { yearnParser } from "./yearn";

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
  ...quickswapAddresses,
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
];
