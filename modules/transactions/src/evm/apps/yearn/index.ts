import { addresses } from "./addresses";
import { assets } from "./assets";
import {
  yearnParser as parser,
  appName as name,
} from "./yearn";

export const app = { addresses, assets, name, parser };
