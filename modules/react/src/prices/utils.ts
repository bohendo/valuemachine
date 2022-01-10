import {
  ValueMachine,
} from "@valuemachine/core";
import {
  PriceFns,
  PriceJson,
} from "@valuemachine/prices";
import {
  Asset,
} from "@valuemachine/types";

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
    setSyncMsg?.(`Fetching price data for ${vm.json.chunks.length} chunks..`);
    const newPrices = await prices.request(vm, unit);
    console.info(`Synced new prices`, newPrices);
    setSyncMsg?.("Successfully fetched prices! Importing..");
    prices.merge(newPrices);
    setPricesJson?.(prices.getJson());
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

