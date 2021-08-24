import {
  compoundAddresses as addresses,
  compoundParser as parser,
  appName as name,
} from "./compound";
import { assets } from "./assets";

export const app = { addresses, assets, name, parser };
