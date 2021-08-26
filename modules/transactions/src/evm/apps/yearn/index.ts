import { addresses } from "./addresses";
import { enums } from "./enums";
import { parser } from "./yearn";

export const app = { addresses, enums, parsers: [parser] };
