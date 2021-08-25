import { addresses } from "./addresses";
import { enums } from "./enums";
import {
  uniswapParser as parser,
  appName as name,
} from "./uniswap";
import { uniswapV3Parser } from "./uniswapV3";

export { addresses } from "./addresses";

export const app = { addresses, enums, name, parser, uniswapV3Parser };
