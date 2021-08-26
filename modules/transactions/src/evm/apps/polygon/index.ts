import { addresses } from "./addresses";
import { enums } from "./enums";
import { parser } from "./polygon";

export const app = { addresses, enums, parsers: [parser] };
