import { addresses } from "./addresses";
import { enums } from "./enums";
import { parser } from "./maker";
import { saiParser } from "./sai";
import { daiParser } from "./dai";
import { oasisParser } from "./oasis";

export const app = { addresses, enums, parsers: [
  parser,
  saiParser,
  daiParser,
  oasisParser,
] };
