import { enums as aave } from "./aave/enums";
import { enums as airswap } from "./airswap/enums";
import { enums as argent } from "./argent/enums";
import { enums as bjtj } from "./bjtj/enums";
import { enums as compound } from "./compound/enums";
import { enums as cryptokitties } from "./cryptokitties/enums";
import { enums as erc20 } from "./erc20/enums";
import { enums as etherdelta } from "./etherdelta/enums";
import { enums as idle } from "./idle/enums";
import { enums as maker } from "./maker/enums";
import { enums as polygon } from "./polygon/enums";
import { enums as quickswap } from "./quickswap/enums";
import { enums as tornado } from "./tornado/enums";
import { enums as uniswap } from "./uniswap/enums";
import { enums as weth } from "./weth/enums";
import { enums as yearn } from "./yearn/enums";

export const Apps = {
  ...aave.Apps,
  ...airswap.Apps,
  ...argent.Apps,
  ...bjtj.Apps,
  ...compound.Apps,
  ...cryptokitties.Apps,
  ...erc20.Apps,
  ...etherdelta.Apps,
  ...idle.Apps,
  ...maker.Apps,
  ...polygon.Apps,
  ...quickswap.Apps,
  ...tornado.Apps,
  ...uniswap.Apps,
  ...weth.Apps,
  ...yearn.Apps,
} as const;

export const Methods = {
  ...aave.Methods,
  ...airswap.Methods,
  ...argent.Methods,
  ...bjtj.Methods,
  ...compound.Methods,
  ...cryptokitties.Methods,
  ...erc20.Methods,
  ...etherdelta.Methods,
  ...idle.Methods,
  ...maker.Methods,
  ...polygon.Methods,
  ...quickswap.Methods,
  ...tornado.Methods,
  ...uniswap.Methods,
  ...weth.Methods,
  ...yearn.Methods,
} as const;

export const Tokens = {
  ...aave.Tokens,
  ...airswap.Tokens,
  ...argent.Tokens,
  ...bjtj.Tokens,
  ...compound.Tokens,
  ...cryptokitties.Tokens,
  ...erc20.Tokens,
  ...etherdelta.Tokens,
  ...idle.Tokens,
  ...maker.Tokens,
  ...polygon.Tokens,
  ...quickswap.Tokens,
  ...tornado.Tokens,
  ...uniswap.Tokens,
  ...weth.Tokens,
  ...yearn.Tokens,
} as const;
