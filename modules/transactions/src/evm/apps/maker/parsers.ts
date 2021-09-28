import { saiParser } from "./sai";
import { daiParser } from "./dai";
import { oasisParser } from "./oasis";
import { tokenParser } from "./tokens";

export const parsers = {
  insert: [tokenParser],
  modify: [saiParser, daiParser, oasisParser],
};
