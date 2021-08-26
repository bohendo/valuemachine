import { saiParser } from "./sai";
import { daiParser } from "./dai";
import { oasisParser } from "./oasis";
import { tokenParser } from "./tokens";

export const insert = [tokenParser];
export const modify = [saiParser, daiParser, oasisParser];

export const parsers = { insert, modify };
