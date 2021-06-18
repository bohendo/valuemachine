import { Account } from "@valuemachine/types";

export const sm = (str: Account): string =>
  str.toString().toLowerCase();

export const smeq = (str1: Account, str2: Account): boolean =>
  sm(str1.toString()) === sm(str2.toString());
