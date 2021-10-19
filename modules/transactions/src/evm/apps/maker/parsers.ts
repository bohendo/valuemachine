import { daiParser } from "./dai";
import { oasisParser } from "./oasis";
import { proxyParser } from "./proxy";
import { saiParser } from "./sai";
import { tokenParser } from "./tokens";

export const parsers = {
  insert: [tokenParser],
  modify: [proxyParser, saiParser, daiParser, oasisParser],
};
