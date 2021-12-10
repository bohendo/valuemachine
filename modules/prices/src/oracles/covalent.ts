import { Logger } from "@valuemachine/types";
import axios from "axios";

export const fetchCovalentPrice = async (
  rawDate: string,
  unit: string,
  asset: string,
  key: string,
  log?: Logger,
): Promise<string> => {
  const covalentUrl = "https://api.covalenthq.com/v1";
  const date = rawDate.includes("T") ? rawDate.split("T")[0] : rawDate;
  const url = `${covalentUrl}/pricing/historical/${unit}/${asset
  }/?from=${date
  }&to=${date
  }&key=${key}`;
  log?.info(`GET ${url}`);
  try {
    const response = await axios.get(url, { timeout: 5000 }) as any;
    if (response.status !== 200) {
      log?.warn(`Bad Status: ${response.status}`);
      return "";
    } else if (response.data.error) {
      log?.warn(`Covalent Error: ${response.data.error_message}`);
      return "";
    } else {
      return response.data.data.prices[0].price.toString();
    }
  } catch (e) {
    log?.warn(`${e.message}: ${
      url.replace(covalentUrl, "covalent").replace(/&key=.*/, "")
    }`);
    return "";
  }
};
