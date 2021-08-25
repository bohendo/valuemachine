import { addresses } from "./addresses";
import { enums } from "./enums";
import {
  makerParser as parser,
  appName as name,
} from "./maker";
import { oasisParser } from "./oasis";

export const app = { addresses, enums, name, parser, oasisParser };
