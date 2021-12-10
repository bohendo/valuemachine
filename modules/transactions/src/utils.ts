import { isAddress as isEvmAddress, getAddress as getEvmAddress } from "@ethersproject/address";
import { hexlify, hexZeroPad } from "@ethersproject/bytes";
import {
  Account,
  Asset,
  Balances,
  Guard,
  Value,
} from "@valuemachine/types";
import {
  ajv,
  describeBalance,
  diffBalances,
  formatErrors,
  math,
  msPerDay,
  sumValue,
} from "@valuemachine/utils";

import {
  AddressCategories,
  Assets,
  Guards,
  Methods,
  TransferCategories,
} from "./enums";
import {
  AddressBook,
  AddressBookJson,
  AddressCategory,
  AddressEntry,
  Transaction,
  TransactionsJson,
  Transfer,
  TxTags,
} from "./types";

const {
  Fee, Income, Expense, SwapIn, SwapOut, Refund, Borrow, Repay, Internal,
} = TransferCategories;

export const getEmptyTransactions = (): TransactionsJson => [];

export const getBlankTransaction = (): Transaction => JSON.parse(JSON.stringify({
  apps: [],
  date: "",
  index: 0,
  method: "",
  sources: [],
  tag: {},
  transfers: [{
    amount: "",
    asset: "",
    category: TransferCategories.Noop,
    from: "",
    to: "",
  }],
  uuid: "",
}));


const validateTransfer = ajv.compile(Transfer);
export const getTransferError = (tx: Transfer): string => {
  if (!validateTransfer(tx)) {
    return validateTransfer.errors.length
      ? formatErrors(validateTransfer.errors)
      : `Invalid Transfer`;
  } else {
    return "";
  }
};

const validateTransaction = ajv.compile(Transaction);
export const getTransactionError = (tx: Transaction): string => {
  if (!validateTransaction(tx)) {
    return validateTransaction.errors.length
      ? formatErrors(validateTransaction.errors)
      : `Invalid Transaction`;
  } else {
    return "";
  }
};

const validateTransactions = ajv.compile(TransactionsJson);
export const getTransactionsError = (transactionsJson: TransactionsJson): string => {
  if (!validateTransactions(transactionsJson)) {
    return validateTransactions.errors.length
      ? formatErrors(validateTransactions.errors)
      : `Invalid Transactions`;
  }
  const indexErrors = transactionsJson.map((tx: Transaction, index: number): string =>
    tx.index !== index ? `Invalid tx index, expected ${index} but got ${tx.index}` : ""
  ).filter(e => !!e);
  if (indexErrors.length) {
    return indexErrors.length < 3
      ? indexErrors.join(", ")
      : `${indexErrors[0]} (plus ${indexErrors.length - 1} more index errors)`;
  } else {
    return "";
  }
};

export const sumTransfers = (transfers: Transfer[]): Balances => sumValue(transfers as Value[]);

export const describeTransaction = (addressBook: AddressBook, tx: Transaction): string => {
  const fees = tx.transfers.filter(t => t.category === Fee);
  const nonFee = tx.transfers.filter(t => t.category !== Fee);
  if (!nonFee.length) {
    return `${tx.method || "Unknown method"} by ${addressBook.getName(fees[0].from, true)}`;

  } else if (nonFee.some(t => t.category === SwapIn) && nonFee.some(t => t.category === SwapOut)) {
    const [inputs, outputs] = diffBalances([sumTransfers(
      nonFee.filter(t => t.category === SwapIn || t.category === Refund)
    ), sumTransfers(
      nonFee.filter(t => t.category === SwapOut)
    )]);
    return `${addressBook.getName(
      nonFee.find(t => t.category === SwapOut).from,
      true,
    )} traded ${describeBalance(outputs)} for ${describeBalance(inputs)}`;

  } else if (nonFee.some(t => t.category === Borrow)) {
    return `${
      addressBook.getName(nonFee.find(t => t.category === Borrow).to, true)
    } borrowed ${
      describeBalance(sumTransfers(nonFee.filter(t => t.category === Borrow)))
    }${nonFee.length > 1 ? ", etc" : ""}`;

  } else if (nonFee.some(t => t.category === Repay)) {
    return `${
      addressBook.getName(nonFee.find(t => t.category === Repay).from, true)
    } repayed ${
      describeBalance(sumTransfers(nonFee.filter(t => t.category === Repay)))
    }${nonFee.length > 1 ? ", etc" : ""}`;

  } else if (nonFee.some(t => t.category === Income)) {
    return `${
      addressBook.getName(nonFee.find(t => t.category === Income).to, true)
    } received ${
      describeBalance(sumTransfers(nonFee.filter(t => t.category === Income)))
    }${nonFee.length > 1 ? ", etc" : ""}`;

  } else if (nonFee.some(t => t.category === Expense)) {
    return `${
      addressBook.getName(nonFee.find(t => t.category === Expense).from, true)
    } spent ${
      describeBalance(sumTransfers(nonFee.filter(t => t.category === Expense)))
    }${nonFee.length > 1 ? ", etc" : ""}`;

  } else if (nonFee.some(t => t.category === Internal)) {
    const transfer = nonFee.find(t => t.category === Internal);
    return `${tx.method || "Transfer"} of ${
      math.round(transfer.amount)} ${transfer.asset
    } from ${
      addressBook.getName(transfer.from, true)
    } to ${
      addressBook.getName(transfer.to, true)
    }${nonFee.length > 1 ? ", etc" : ""}`;

  } else if (tx.method) {
    return `${tx.method} by ${addressBook.getName(
      addressBook.isSelf(tx.transfers[0].to) ? tx.transfers[0].to : tx.transfers[0].from,
      true,
    )}`;

  } else {
    return `Unknown method by ${addressBook.getName(
      addressBook.isSelf(tx.transfers[0].to) ? tx.transfers[0].to : tx.transfers[0].from,
      true,
    )}`;
  }
};

// Used to guess the network when depositing to/withdrawing from an exchange
// Ideally, the exchange would provide this info explicitly
export const getGuard = (asset: Asset): Guard =>
  asset === Assets.BTC ? Guards.Bitcoin
  : asset === Assets.BCH ? Guards.BitcoinCash
  : asset === Assets.LTC ? Guards.Litecoin
  : asset === Assets.ETC ? Guards.EthereumClassic
  : asset === Assets.USD ? Guards.USA
  : asset === Assets.CZK ? Guards.CZE
  : asset === Assets.GBP ? Guards.GBR
  : asset === Assets.INR ? Guards.IND
  : Guards.Ethereum;

let txIndex = 0;
export const getTestTx = (transfers: Transfer[]): Transaction => ({
  date: new Date(
    new Date("2020-01-01T01:00:00Z").getTime() + (txIndex * msPerDay)
  ).toISOString(),
  uuid: `Test/${hexZeroPad(hexlify(txIndex), 32)}`,
  index: txIndex++,
  method: Methods.Unknown,
  sources: [],
  apps: [],
  tag: {},
  transfers: transfers || [],
});

////////////////////////////////////////
// AddressBook

export const getEmptyAddressBook = (): AddressBookJson => ({});

export const getBlankAddressEntry = (): AddressEntry => JSON.parse(JSON.stringify({
  address: "",
  category: AddressCategories.Self,
  name: "",
}));

// Address Validators

const validateAddressBook = ajv.compile(AddressBookJson);
const validateAddressEntry = ajv.compile(AddressEntry);

export const getAddressBookError = (addressBookJson: AddressBookJson): string =>
  validateAddressBook(addressBookJson)
    ? ""
    : validateAddressBook.errors.length ? formatErrors(validateAddressBook.errors)
    : `Invalid AddressBook: ${JSON.stringify(addressBookJson)}`;

export const getAddressEntryError = (addressEntry: AddressEntry): string =>
  validateAddressEntry(addressEntry)
    ? ""
    : validateAddressEntry.errors.length ? formatErrors(validateAddressEntry.errors)
    : `Invalid AddressBook Entry: ${JSON.stringify(addressEntry)}`;

// Address Formatters

export const fmtAddress = (address: string) => {
  if (address.includes("/")) {
    const parts = address.split("/");
    const suffix = parts.pop();
    const prefix = parts.join("/"); // leftover after popping the address off
    return `${prefix}/${isEvmAddress(suffix) ? getEvmAddress(suffix) : suffix}`;
  } else {
    return isEvmAddress(address) ? getEvmAddress(address) : address;
  }
};

export const insertVenue = (account?: Account, venue?: string): string => {
  if (!account) return "";
  if (!venue) return account;
  const parts = account.split("/");
  parts.splice(-1, 0, venue);
  return fmtAddress(parts.join("/"));
};

export const fmtAddressEntry = (entry: AddressEntry): AddressEntry => {
  const error = getAddressEntryError(entry);
  if (error) throw new Error(error);
  entry.address = fmtAddress(entry.address);
  return entry;
};

// Careful: this will silently discard duplicate entries
export const fmtAddressBook = (addressBookJson: AddressBookJson): AddressBookJson => {
  const error = getAddressBookError(addressBookJson);
  if (error) throw new Error(error);
  const cleanAddressBook = {} as AddressBookJson;
  Object.keys(addressBookJson).forEach(address => {
    const cleanAddress = fmtAddress(address);
    cleanAddressBook[cleanAddress] = {
      ...addressBookJson[address],
      ...addressBookJson[cleanAddress], // perfer data from checksummed address entries
      address: cleanAddress,
    };
  });
  return cleanAddressBook;
};

export const setAddressCategory = (category: AddressCategory) =>
  (entry: Partial<AddressEntry>): AddressEntry =>
    fmtAddressEntry({
      ...entry,
      category,
    } as AddressEntry);

// Puts addresses most relevant to the user first
export const sortAddressEntries = (addressEntries: AddressEntry[]): AddressEntry[] =>
  addressEntries.sort((e1, e2) =>
    // put self addresses first
    (e1.category !== AddressCategories.Self && e2.category === AddressCategories.Self) ? 1
    : (e1.category === AddressCategories.Self && e2.category !== AddressCategories.Self) ? -1
    // sort by category
    : (e1.category.toLowerCase() > e2.category.toLowerCase()) ? 1
    : (e1.category.toLowerCase() < e2.category.toLowerCase()) ? -1
    // then sort by name
    : (e1.name.toLowerCase() > e2.name.toLowerCase()) ? 1
    : (e1.name.toLowerCase() < e2.name.toLowerCase()) ? -1
    // then sort by address
    : (e1.address.toLowerCase() > e2.address.toLowerCase()) ? 1
    : (e1.address.toLowerCase() < e2.address.toLowerCase()) ? -1
    : 0
  );

////////////////////////////////////////
// Tags

export const getEmptyTxTags = (): TxTags => ({});

const validateTxTags = ajv.compile(TxTags);
export const getTxTagsError = (txTags: TxTags): string => validateTxTags(txTags) ? ""
  : validateTxTags.errors.length ? formatErrors(validateTxTags.errors)
  : `Invalid TxTags: ${JSON.stringify(txTags)}`;
