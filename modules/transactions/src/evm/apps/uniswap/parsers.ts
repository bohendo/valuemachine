import { govParser } from "./gov";
import { v1Parser } from "./v1";
import { v2Parser } from "./v2";
import { v3Parser } from "./v3";

export const parsers = {
  insert: [],
  modify: [v1Parser, v2Parser, v3Parser, govParser],
};
