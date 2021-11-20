import { getTaxRows } from "@valuemachine/taxes";
import {
  AddressBook,
  Asset,
  Prices,
  ValueMachine,
  TaxRows,
  TxTags,
} from "@valuemachine/types";

export const syncTaxRows = async ({
  addressBook,
  prices,
  setSyncMsg,
  setTaxRows,
  txTags,
  unit,
  vm,
}: {
  addressBook: AddressBook;
  prices: Prices;
  setSyncMsg?: (val: string) => void;
  setTaxRows?: (val: TaxRows) => void;
  txTags: TxTags;
  unit: Asset;
  vm: ValueMachine;
}): Promise<TaxRows> => {
  setSyncMsg?.("Syncing Tax Data..");
  const taxRows = await getTaxRows({
    addressBook,
    prices,
    txTags,
    userUnit: unit,
    vm,
  });
  console.log(`Generated ${taxRows.length} tax rows!`, taxRows);
  setSyncMsg?.("");
  setTaxRows?.(taxRows);
  return taxRows;
};
