import { addresses } from "./addresses";
import { enums } from "./enums";
import { parser } from "./etherdelta";

export const app = { addresses, enums, parsers: [parser] };
