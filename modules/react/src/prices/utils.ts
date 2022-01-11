import {
  ValueMachine,
} from "@valuemachine/core";
import {
  PriceFns,
  PriceJson,
  isSupportedByCoinGecko,
} from "@valuemachine/prices";
import {
  Asset,
} from "@valuemachine/types";
import axios from "axios";

export const syncPrices = async ({
  prices,
  setPricesJson,
  setSyncMsg,
  unit,
  vm,
}: {
  prices: PriceFns;
  setPricesJson?: (val: PriceJson) => void;
  setSyncMsg?: (val: string) => void;
  unit: Asset;
  vm: ValueMachine;
}): Promise<PriceFns> => {
  try {
    // TODO: calculate prices from vm data before requesting anything
    setSyncMsg?.(`Calculating price data for ${vm.json.chunks.length} chunks..`);
    await new Promise(res => setTimeout(res, 1)); // yield to update sync msg
    const newPrices = await prices.calcPrices(vm);
    prices.merge(newPrices);
    setPricesJson?.(prices.getJson());
    const missing = prices.getMissing(vm, unit);
    for (const asset of Object.keys(missing)) {
      if (asset === unit) {
        console.log(`Asset & unit are the same (${asset}), skipping price sync`);
      } else if (isSupportedByCoinGecko(asset)) {
        setSyncMsg?.(`Fetching ${missing[asset].length} missing ${unit} prices for ${asset}..`);
        newPrices.push(...(await axios.post(
          `/api/prices/${unit}/${asset}`,
          { dates: missing[asset] },
        ) as any).data);
      } else {
        console.warn(`Can't sync prices for ${asset} bc CoinGecko doesn't support it`);
      }
    }
    setSyncMsg?.(`Importing ${newPrices.length} newly synced prices..`);
    await new Promise(res => setTimeout(res, 1)); // yield to update sync msg
    prices.merge(newPrices);
    setPricesJson?.(prices.getJson());
    console.info(`Synced new prices`, newPrices);
    setSyncMsg?.("Successfully synced prices");
    return new Promise(res => {
      setTimeout(() => { setSyncMsg?.(""); res(prices); }, 1000);
    });
  } catch (e: any) {
    console.error(`Failed to sync prices:`, e);
    if (typeof e?.message === "string") {
      setSyncMsg?.(e.message);
      return new Promise(res => {
        setTimeout(() => { setSyncMsg?.(""); res(prices); }, 5000);
      });
    } else {
      setSyncMsg?.("Something went wrong..");
      return new Promise(res => {
        setTimeout(() => { setSyncMsg?.(""); res(prices); }, 3000);
      });
    }
  }
};

