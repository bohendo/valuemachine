import { getTaxRows } from "@valuemachine/taxes";
import {
  AddressBook,
  Asset,
  Prices,
  ValueMachine,
  TaxRows,
  TxTags,
} from "@valuemachine/types";

export const syncTaxRows = async (
  addressBook: AddressBook,
  prices: Prices,
  txTags: TxTags,
  unit: Asset,
  vm: ValueMachine,
  setTaxRows?: (val: TaxRows) => void,
  setSyncMsg?: (val: string) => void,
): Promise<TaxRows> => {
  setSyncMsg?.("Syncing Tax Data..");
  const taxRows = await getTaxRows({ addressBook, prices, txTags, userUnit: unit, vm });
  setSyncMsg?.("");
  setTaxRows?.(taxRows);
  return taxRows;
};
