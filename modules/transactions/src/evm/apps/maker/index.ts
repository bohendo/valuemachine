import { addresses } from "./addresses";
import { assets } from "./assets";
import {
  makerParser as parser,
  appName as name,
} from "./maker";
import { oasisParser } from "./oasis";

export const app = { addresses, assets, name, parser, oasisParser };
