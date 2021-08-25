import { enums as aaveAssets } from "./aave/enums";
import { enums as compoundAssets } from "./compound/enums";
import { enums as erc20Assets } from "./erc20/enums";
import { enums as idleAssets } from "./idle/enums";
import { enums as makerAssets } from "./maker/enums";
import { enums as quickswapAssets } from "./quickswap/enums";
import { enums as tornadoAssets } from "./tornado/enums";
import { enums as uniswapAssets } from "./uniswap/enums";
import { enums as wethEnums } from "./weth/enums";
import { enums as yearnAssets } from "./yearn/enums";

export const Tokens = {
  ...aaveAssets,
  ...compoundAssets,
  ...erc20Assets,
  ...idleAssets,
  ...makerAssets,
  ...quickswapAssets,
  ...tornadoAssets,
  ...uniswapAssets,
  ...wethEnums.assets,
  ...yearnAssets,
} as const;
