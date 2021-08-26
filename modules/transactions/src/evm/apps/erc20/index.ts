import { addresses } from "./addresses";
import { enums } from "./enums";
import { parser } from "./erc20";

export const app = { addresses, enums, parsers: [parser] };
