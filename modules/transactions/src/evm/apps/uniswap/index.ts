import { addresses } from "./addresses";
import { enums } from "./enums";
import { parser } from "./uniswap";
import { uniswapV3Parser } from "./uniswapV3";

export { addresses } from "./addresses";

export const app = { addresses, enums, parsers: [parser, uniswapV3Parser] };
