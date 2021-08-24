import {
  uniswapAddresses as coreAddresses,
  uniswapParser as parser,
  appName as name,
} from "./uniswap";
import { uniswapV3Addresses, uniswapV3Parser } from "./uniswapV3";

const addresses = [...coreAddresses, ...uniswapV3Addresses];

export const app = { addresses, assets: {}, name, parser, uniswapV3Parser };
