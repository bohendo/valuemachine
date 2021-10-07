import { enums as aave } from "./aave/enums";
import { enums as airswap } from "./airswap/enums";
import { enums as argent } from "./argent/enums";
import { enums as bjtj } from "./bjtj/enums";
import { enums as compound } from "./compound/enums";
import { enums as cryptokitties } from "./cryptokitties/enums";
import { enums as tokens } from "./tokens/enums";
import { enums as etherdelta } from "./etherdelta/enums";
import { enums as ens } from "./ens/enums";
import { enums as idex } from "./idex/enums";
import { enums as idle } from "./idle/enums";
import { enums as maker } from "./maker/enums";
import { enums as nfts } from "./nfts/enums";
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
  ...tokens.Apps,
  ...etherdelta.Apps,
  ...ens.Apps,
  ...idex.Apps,
  ...idle.Apps,
  ...maker.Apps,
  ...nfts.Apps,
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
  ...etherdelta.Methods,
  ...ens.Methods,
  ...idex.Methods,
  ...idle.Methods,
  ...maker.Methods,
  ...nfts.Methods,
  ...polygon.Methods,
  ...quickswap.Methods,
  ...tokens.Methods,
  ...tornado.Methods,
  ...uniswap.Methods,
  ...weth.Methods,
  ...yearn.Methods,
  Receipt: "Receipt",
  Creation: "Creation",
  Failure: "Failure",
  Redeem: "Redeem",
  Unknown: "Unknown",
} as const;

export const Tokens = {
  ...aave.Tokens,
  ...airswap.Tokens,
  ...argent.Tokens,
  ...bjtj.Tokens,
  ...compound.Tokens,
  ...cryptokitties.Tokens,
  ...tokens.Tokens,
  ...etherdelta.Tokens,
  ...ens.Tokens,
  ...idex.Tokens,
  ...idle.Tokens,
  ...maker.Tokens,
  ...nfts.Tokens,
  ...polygon.Tokens,
  ...quickswap.Tokens,
  ...tornado.Tokens,
  ...uniswap.Tokens,
  ...weth.Tokens,
  ...yearn.Tokens,
} as const;
