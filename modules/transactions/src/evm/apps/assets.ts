import { assets as aaveAssets } from "./aave/assets";
import { assets as compoundAssets } from "./compound/assets";
import { assets as erc20Assets } from "./erc20/assets";
import { assets as idleAssets } from "./idle/assets";
import { assets as makerAssets } from "./maker/assets";
import { assets as quickswapAssets } from "./quickswap/assets";
import { assets as tornadoAssets } from "./tornado/assets";
import { assets as uniswapAssets } from "./uniswap/assets";
import { assets as wethAssets } from "./weth/assets";
import { assets as yearnAssets } from "./yearn/assets";

export const Tokens = {
  ...aaveAssets,
  ...compoundAssets,
  ...erc20Assets,
  ...idleAssets,
  ...makerAssets,
  ...quickswapAssets,
  ...tornadoAssets,
  ...uniswapAssets,
  ...wethAssets,
  ...yearnAssets,
} as const;
