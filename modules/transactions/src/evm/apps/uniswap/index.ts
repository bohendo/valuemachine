import { addresses } from "./addresses";
import {
  uniswapParser as parser,
  appName as name,
} from "./uniswap";
import { uniswapV3Parser } from "./uniswapV3";

export const app = { addresses, assets: {}, name, parser, uniswapV3Parser };
