import { addresses } from "./addresses";
import { enums } from "./enums";
import { parser } from "./quickswap";

export const app = { addresses, enums, parsers: [parser] };
