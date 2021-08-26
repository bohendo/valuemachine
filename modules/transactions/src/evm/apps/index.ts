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

export { addresses } from "./addresses";

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
  ...aave.enums.apps,
  ...argent.enums.apps,
  ...compound.enums.apps,
  ...erc20.enums.apps,
  ...etherdelta.enums.apps,
  ...idle.enums.apps,
  ...maker.enums.apps,
  ...polygon.enums.apps,
  ...quickswap.enums.apps,
  ...tornado.enums.apps,
  ...uniswap.enums.apps,
  ...weth.enums.apps,
  ...yearn.enums.apps,
} as const;

export const AppAssets = {
  ...aave.enums.assets,
  ...argent.enums.assets,
  ...compound.enums.assets,
  ...erc20.enums.assets,
  ...etherdelta.enums.assets,
  ...idle.enums.assets,
  ...maker.enums.assets,
  ...polygon.enums.assets,
  ...quickswap.enums.assets,
  ...tornado.enums.assets,
  ...uniswap.enums.assets,
  ...weth.enums.assets,
  ...yearn.enums.assets,
} as const;

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
