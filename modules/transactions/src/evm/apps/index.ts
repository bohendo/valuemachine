import { parsers as aaveParsers } from "./aave";
import { parsers as airswapParsers } from "./airswap";
import { parsers as bjtjParsers } from "./bjtj";
import { parsers as argentParsers } from "./argent";
import { parsers as compoundParsers } from "./compound";
import { parsers as cryptokittiesParsers } from "./cryptokitties";
import { parsers as tokensParsers } from "./tokens";
import { parsers as etherdeltaParsers } from "./etherdelta";
import { parsers as eth2Parsers } from "./eth2";
import { parsers as ensParsers } from "./ens";
import { parsers as idexParsers } from "./idex";
import { parsers as idleParsers } from "./idle";
import { parsers as makerParsers } from "./maker";
import { parsers as nftsParsers } from "./nfts";
import { parsers as polygonAppParsers } from "./polygon";
import { parsers as quickswapParsers } from "./quickswap";
import { parsers as tornadoParsers } from "./tornado";
import { parsers as uniswapParsers } from "./uniswap";
import { parsers as wethParsers } from "./weth";
import { parsers as yearnParsers } from "./yearn";

export { addresses } from "./addresses";
export { Apps, Methods, Tokens } from "./enums";

export const ethereumParsers = [
  aaveParsers,
  airswapParsers,
  bjtjParsers,
  argentParsers,
  compoundParsers,
  cryptokittiesParsers,
  tokensParsers,
  etherdeltaParsers,
  eth2Parsers,
  ensParsers,
  idexParsers,
  idleParsers,
  makerParsers,
  nftsParsers,
  polygonAppParsers,
  quickswapParsers,
  tornadoParsers,
  uniswapParsers,
  wethParsers,
  yearnParsers,
];

export const polygonParsers = [
  aaveParsers,
  tokensParsers,
  quickswapParsers,
  wethParsers,
];
