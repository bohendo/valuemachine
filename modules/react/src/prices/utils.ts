import {
  Asset,
  Prices,
  PricesJson,
  ValueMachine,
} from "@valuemachine/types";
import axios from "axios";

export const syncPrices = async ({
  prices,
  setPricesJson,
  setSyncMsg,
  unit,
  vm,
}: {
  prices: Prices;
  setPricesJson?: (val: PricesJson) => void;
  setSyncMsg?: (val: string) => void;
  unit: Asset;
  vm: ValueMachine;
}): Promise<Prices> => {
  try {
    setSyncMsg?.(`Fetching price data for ${vm.json.chunks.length} chunks..`);
    const newPrices = (await axios.post(
      `/api/prices/chunks/${unit}`,
      { chunks: vm.json.chunks },
    ) as any).data;
    console.info(`Synced new prices`, newPrices);
    setSyncMsg?.("Successfully fetched prices! Importing..");
    prices.merge(newPrices);
    setPricesJson?.({ ...prices.json });
    setSyncMsg?.("Successfully synced prices");
    setTimeout(() => setSyncMsg?.(""), 1000);
  } catch (e: any) {
    console.error(`Failed to sync prices:`, e);
    if (typeof e?.message === "string") {
      setSyncMsg?.(e.message);
      setTimeout(() => setSyncMsg?.(""), 5000);
    }
  }
  return prices;
};

