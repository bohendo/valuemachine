import { CsvParser } from "@valuemachine/types";

import { CsvSources } from "../enums";

import { coinbaseParser, coinbaseHeaders } from "./coinbase";
import { digitaloceanParser, digitaloceanHeaders } from "./digitalocean";
import { elementsParser, elementsHeaders } from "./elements";
import { wyreParser, wyreHeaders } from "./wyre";
import { wazirxParser, wazirxHeaders } from "./wazirx";

export const headersToSource = (header: string): string => {
  if (!header) return "";
  else if (coinbaseHeaders.includes(header)) return CsvSources.Coinbase;
  else if (digitaloceanHeaders.includes(header)) return CsvSources.DigitalOcean;
  else if (elementsHeaders.includes(header)) return CsvSources.Elements;
  else if (wazirxHeaders.includes(header)) return CsvSources.Wazirx;
  else if (wyreHeaders.includes(header)) return CsvSources.Wyre;
  else return "";
};

export const getCsvParser = (source: string): CsvParser => {
  if (!source) return () => [];
  else if (source === CsvSources.Coinbase) return coinbaseParser;
  else if (source === CsvSources.DigitalOcean) return digitaloceanParser;
  else if (source === CsvSources.Elements) return elementsParser;
  else if (source === CsvSources.Wazirx) return wazirxParser;
  else if (source === CsvSources.Wyre) return wyreParser;
  else return () => [];
};
