import { saiParser } from "./sai";
import { daiParser } from "./dai";
import { oasisParser } from "./oasis";
import { tokenParser } from "./tokens";

export const insert = [tokenParser];
export const modify = [oasisParser, saiParser, daiParser];

export const parsers = { insert, modify };
