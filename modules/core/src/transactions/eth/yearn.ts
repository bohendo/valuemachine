import {
  AddressBook,
  AddressBookJson,
  AddressCategories,
  ChainData,
  EthTransaction,
  Logger,
  Transaction,
  TransactionSources,
} from "@finances/types";
import { sm, smeq } from "@finances/utils";

import { getUnique } from "../utils";

const source = TransactionSources.Yearn;

////////////////////////////////////////
/// Addresses

const machineryAddresses = [
  { name: "yDAI-vault", address: "0xacd43e627e64355f1861cec6d3a6688b31a6f952" },
  { name: "yGUSD-vault", address: "0xec0d8d3ed5477106c6d4ea27d90a60e594693c90" },
  { name: "yTUSD-vault", address: "0x37d19d1c4e1fa9dc47bd1ea12f742a0887eda74a" },
  { name: "yUSDC-vault", address: "0x597ad1e0c13bfe8025993d9e79c69e1c0233522e" },
  { name: "yUSDT-vault", address: "0x2f08119c6f07c006695e079aafc638b8789faf18" },
  { name: "yWETH-vault", address: "0xe1237aa7f535b0cc33fd973d66cbf830354d16c7" },
  { name: "yYFI-vault", address: "0xba2e7fed597fd0e3e70f5130bcdbbfe06bb94fe1" },
].map(row => ({ ...row, category: AddressCategories.Defi })) as AddressBookJson;

const yTokenAddresses = [
  { name: "ycrvUSD", address: "0xdf5e0e81dff6faf3a7e52ba697820c5e32d806a8" },
  { name: "yBUSDv3", address: "0x04bc0ab673d88ae9dbc9da2380cb6b79c4bca9ae" },
  { name: "yDAIv2", address: "0x16de59092dae5ccf4a1e6439d611fd0653f0bd01" },
  { name: "yDAIv3", address: "0xc2cb1040220768554cf699b0d863a3cd4324ce32" },
  { name: "ysUSDTv2", address: "0xf61718057901f84c4eec4339ef8f0d86d2b45600" },
  { name: "yTUSDv2", address: "0x73a052500105205d34daf004eab301916da8190f" },
  { name: "yUSDCv2", address: "0xd6ad7a6750a7593e092a9b218d66c0a814a3436e" },
  { name: "yUSDCv3", address: "0x26ea744e5b887e5205727f55dfbe8685e3b21951" },
  { name: "yUSDTv2", address: "0x83f798e925bcd4017eb265844fddabb448f1707d" },
  { name: "yUSDTv3", address: "0xe6354ed5bc4b393a5aad09f21c46e101e692d447" },
  { name: "yWBTCv2", address: "0x04aa51bbcb46541455ccf1b8bef2ebc5d3787ec9" },
].map(row => ({ ...row, category: AddressCategories.ERC20 })) as AddressBookJson;

const govTokenAddresses = [
  { name: "YFI", address: "0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e" },
].map(row => ({ ...row, category: AddressCategories.ERC20 })) as AddressBookJson;

export const yearnAddresses = [
  ...yTokenAddresses,
  ...govTokenAddresses,
  ...machineryAddresses,
] as AddressBookJson;

////////////////////////////////////////
/// Interfaces
////////////////////////////////////////
/// Parser

export const yearnParser = (
  tx: Transaction,
  ethTx: EthTransaction,
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: source });
  const { getName } = addressBook;

  for (const txLog of ethTx.logs.filter(
    l => yearnAddresses.some(e => smeq(e.address, l.address))
  )) {
    const address = sm(txLog.address);
    log.info(`Yearn tx interacted w ${getName(address)}`);
    tx.sources = getUnique([source, ...tx.sources]) as TransactionSources[];
  }

  // log.debug(tx, `Done parsing ${source}`);
  return tx;
};
