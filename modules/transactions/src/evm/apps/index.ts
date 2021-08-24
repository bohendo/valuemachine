import { app as aave } from "./aave";
import { app as argent } from "./argent";
import { app as compound } from "./compound";
import { app as erc20 } from "./erc20";
import { app as etherdelta } from "./etherdelta";
import { app as idle } from "./idle";
import { app as maker } from "./maker";
import { app as polygon } from "./polygon";
import { app as quickswap } from "./quickswap";
import { app as tornado } from "./tornado";
import { app as uniswap } from "./uniswap";
import { app as weth } from "./weth";
import { app as yearn } from "./yearn";

export const aaveParser = aave.parser;
export const argentParser = argent.parser;
export const compoundParser = compound.parser;
export const erc20Parser = erc20.parser;
export const etherdeltaParser = etherdelta.parser;
export const idleParser = idle.parser;
export const makerParser = maker.parser;
export const oasisParser = maker.oasisParser;
export const polygonParser = polygon.parser;
export const quickswapParser = quickswap.parser;
export const tornadoParser = tornado.parser;
export const uniswapParser = uniswap.parser;
export const uniswapV3Parser = uniswap.uniswapV3Parser;
export const wethParser = weth.parser;
export const yearnParser = yearn.parser;

export const AppNames = {
  [aave.name]: aave.name,
  [argent.name]: argent.name,
  [compound.name]: compound.name,
  [erc20.name]: erc20.name,
  [etherdelta.name]: etherdelta.name,
  [idle.name]: idle.name,
  [maker.name]: maker.name,
  [polygon.name]: polygon.name,
  [quickswap.name]: quickswap.name,
  [tornado.name]: tornado.name,
  [uniswap.name]: uniswap.name,
  [weth.name]: weth.name,
  [yearn.name]: yearn.name,
} as const;

export const appAddresses = [
  ...aave.addresses,
  ...argent.addresses,
  ...compound.addresses,
  ...etherdelta.addresses,
  ...idle.addresses,
  ...erc20.addresses,
  ...maker.addresses,
  ...polygon.addresses,
  ...quickswap.addresses,
  ...tornado.addresses,
  ...uniswap.addresses,
  ...weth.addresses,
  ...yearn.addresses,
];

// Order matters!
// Complex parsers usually depend on simple ones so put ERC20 & weth first
export const appParsers = [
  erc20Parser,
  wethParser,
  polygonParser,
  quickswapParser,
  makerParser,
  oasisParser,
  compoundParser,
  aave.parser,
  etherdeltaParser,
  uniswapParser,
  uniswapV3Parser,
  idleParser,
  yearnParser,
  tornadoParser,
  argentParser,
];
