// TODO: import assets directly from the file where they're defined
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

export const Tokens = {
  ...aave.assets,
  ...argent.assets,
  ...compound.assets,
  ...erc20.assets,
  ...etherdelta.assets,
  ...idle.assets,
  ...maker.assets,
  ...polygon.assets,
  ...quickswap.assets,
  ...tornado.assets,
  ...uniswap.assets,
  ...weth.assets,
  ...yearn.assets,
} as const;
