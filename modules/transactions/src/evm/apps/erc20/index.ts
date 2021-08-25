import { addresses } from "./addresses";
import { enums } from "./enums";
import {
  erc20Parser as parser,
  appName as name,
} from "./erc20";

export const app = { addresses, enums, name, parser };
