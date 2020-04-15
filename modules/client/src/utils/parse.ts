import {
  AddressBookByCategory,
  CallData,
  Event,
  TransactionData,
  TransactionLog,
} from '../types';

import {
  getAssetType,
  getCategory,
} from './getters';

import {
  addressToName,
  isDefi,
  isProxy,
  isExchange,
} from './utils';
import { getPrice } from './priceFetcher';

import {
  findDefiCategory,
  findExchangeCategory,
  findTxLogCategory,
} from './parseLogs';

export const createEventFromLog = async (
  addressBookByCategory: AddressBookByCategory,
  txLog: TransactionLog,
  txn: TransactionData
) => {
  if (!txn.to) {
    console.log(txn);
    return null;
  }

  if (isDefi(addressBookByCategory, txLog.address)) {
    let {category, assetType, quantity} = findDefiCategory(addressBookByCategory, txLog);
    if (category !== 'unknown') {
      return {
        amount: quantity,
        type: assetType,
        category,
        date: txn.timestamp,
        from: addressToName(addressBookByCategory, txn.from),
        hash: txn.hash,
        price: await getPrice(assetType, txn.timestamp),
        source: "defi",
        to: addressToName(addressBookByCategory, txn.to),
      } as Event
    }
  }
  else if (addressBookByCategory['erc20'][txLog.address.toLowerCase()]) {
    let {category, assetType, quantity} = findTxLogCategory(addressBookByCategory, txLog, txn);
    if (category !== 'unknown') {
      return {
        amount: quantity,
        type: assetType,
        category,
        date: txn.timestamp,
        from: addressToName(addressBookByCategory, txn.from),
        hash: txn.hash,
        price: await getPrice(assetType, txn.timestamp),
        source: "exchange",
        to: addressToName(addressBookByCategory, txn.to),
      } as Event
    }
  }
  else if (isExchange(addressBookByCategory, txLog.address) && isProxy(addressBookByCategory, txn.to!)) {
    let {category, assetType, quantity} = findExchangeCategory(addressBookByCategory, txLog);
    if (category !== 'unknown') {
      return {
        amount: quantity,
        type: assetType,
        category,
        date: txn.timestamp,
        from: addressToName(addressBookByCategory, txn.from),
        hash: txn.hash,
        price: await getPrice(assetType, txn.timestamp),
        source: "exchange",
        to: addressToName(addressBookByCategory, txn.to),
      } as Event
    }
  }
  
  return null;
}

export const createEventFromCallData = async (
  call: CallData,
  addressBookByCategory: AddressBookByCategory
) => {
  let assetType = getAssetType(call, addressBookByCategory);

  if (assetType !== "ETH") {
    console.log(assetType, call.hash);
    return null;
  }

  let category = getCategory(call.from, call.to, addressBookByCategory);

  if (category === 'unknown') {
    return null;
  }

  let price = await getPrice(assetType, call.timestamp);

  return ({
    category,
    amount: call.value,
    type: assetType,
    date: call.timestamp,
    to: addressToName(addressBookByCategory, call.to),
    from: addressToName(addressBookByCategory, call.from),
    hash: call.hash,
    price,
    source: "ethereum",
    } as Event)
}

export const createEventFromTransactionData = async (
  txn: TransactionData,
  addressBookByCategory: AddressBookByCategory,
) => {

  let assetType = getAssetType(txn, addressBookByCategory);
  if (!assetType || assetType === 'unknown') { return null; }

  let category = getCategory(txn.from, txn.to!, addressBookByCategory);

  if (category === 'unknown') { return null; }

  if (category === 'proxy') { return null; }

  let price = await getPrice(assetType, txn.timestamp);

  return ({
    category,
    amount: txn.value,
    type: assetType,
    date: txn.timestamp,
    to: addressToName(addressBookByCategory, txn.to),
    from: addressToName(addressBookByCategory, txn.from),
    hash: txn.hash,
    price,
    source: "ethereum",
    } as Event)
}
