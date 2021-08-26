import { enums as aave } from "./aave/enums";
import { enums as compound } from "./compound/enums";
import { enums as erc20 } from "./erc20/enums";
import { enums as idle } from "./idle/enums";
import { enums as maker } from "./maker/enums";
import { enums as quickswap } from "./quickswap/enums";
import { enums as tornado } from "./tornado/enums";
import { enums as uniswap } from "./uniswap/enums";
import { enums as wethEnums } from "./weth/enums";
import { enums as yearn } from "./yearn/enums";

export const EvmApps = {
  ...aave.apps,
  ...compound.apps,
  ...erc20.apps,
  ...idle.apps,
  ...maker.apps,
  ...quickswap.apps,
  ...tornado.apps,
  ...uniswap.apps,
  ...wethEnums.apps,
  ...yearn.apps,
} as const;

export const Tokens = {
  ...aave.assets,
  ...compound.assets,
  ...erc20.assets,
  ...idle.assets,
  ...maker.assets,
  ...quickswap.assets,
  ...tornado.assets,
  ...uniswap.assets,
  ...wethEnums.assets,
  ...yearn.assets,
} as const;
