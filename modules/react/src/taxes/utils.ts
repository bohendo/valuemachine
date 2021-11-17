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
  console.log(`Getting tax rows...`);
  const taxRows = await getTaxRows({
    addressBook,
    prices,
    txTags,
    userUnit: unit,
    vm,
  });
  console.log(`Got tax rows!`);
  setSyncMsg?.("");
  setTaxRows?.(taxRows);
  return taxRows;
};
