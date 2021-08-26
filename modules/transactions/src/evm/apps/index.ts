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

export const aaveParsers = aave.parsers;
export const argentParsers = argent.parsers;
export const compoundParsers = compound.parsers;
export const erc20Parsers = erc20.parsers;
export const etherdeltaParsers = etherdelta.parsers;
export const idleParsers = idle.parsers;
export const makerParsers = maker.parsers;
export const polygonParsers = polygon.parsers;
export const quickswapParsers = quickswap.parsers;
export const tornadoParsers = tornado.parsers;
export const uniswapParsers = uniswap.parsers;
export const wethParsers = weth.parsers;
export const yearnParsers = yearn.parsers;

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
