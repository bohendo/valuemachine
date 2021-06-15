import { argentAddresses, argentParser } from "./argent";
import { compoundAddresses, compoundParser } from "./compound";
import { erc20Addresses, erc20Parser } from "./erc20";
import { etherdeltaAddresses, etherdeltaParser } from "./etherdelta";
import { idleAddresses, idleParser } from "./idle";
import { makerAddresses, makerParser } from "./maker";
import { oasisAddresses, oasisParser } from "./oasis";
import { tornadoAddresses, tornadoParser } from "./tornado";
import { uniswapAddresses, uniswapParser } from "./uniswap";
import { wethAddresses, wethParser } from "./weth";
import { yearnAddresses, yearnParser } from "./yearn";

export const publicAddresses = [
  ...argentAddresses,
  ...compoundAddresses,
  ...etherdeltaAddresses,
  ...idleAddresses,
  ...erc20Addresses,
  ...makerAddresses,
  ...oasisAddresses,
  ...tornadoAddresses,
  ...uniswapAddresses,
  ...wethAddresses,
  ...yearnAddresses,
];

// Order matters!
// Complex parsers usually depend on simple ones so put ERC20 & weth first
export const appParsers = [
  erc20Parser,
  wethParser,
  oasisParser,
  makerParser,
  compoundParser,
  etherdeltaParser,
  uniswapParser,
  idleParser,
  yearnParser,
  tornadoParser,
  argentParser,
];
