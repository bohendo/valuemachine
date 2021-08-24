import {
  makerAddresses as coreAddresses,
  makerParser as parser,
  appName as name,
} from "./maker";
import { oasisAddresses, oasisParser } from "./oasis";

const addresses = [...coreAddresses, ...oasisAddresses];

export const app = { addresses, name, parser, oasisParser };
