import _ from 'lodash';
import { getPrice } from '@finances/core';
import {
  AssetTotal,
  ChainData,
  CallData,
  TotalByCategoryPerAssetType,
  TransactionData,
} from "@finances/types";

import * as cache from './cache';

import {
  AddressBook,
  AddressBookByCategory,
  Event,
  EventByCategoryPerAssetType,
  TransactionLog,
} from '../types';

import {
  filterEventsByTx,
  filterEventsByNoTaxLiability,
  filterEventsByAddress,
  filterEventByCategory,
} from './filters';

import {
  In,
  NULL_ADDRESS,
  Out,
  mergeArray,
  sortAllEventByDate,
  isExchange,
  isDefi,
  isProxy,
} from './utils';

import {
  createEventFromCallData,
  createEventFromTransactionData,
  createEventFromLog,
} from './parse';

let addressBookByCategory: AddressBookByCategory;

export const getNetWorthOn = (
  netStandingByAssetTypeOn: Array<{assetType: string, total: number, totalUSD: number}>,
): number => {
  return _.round(_.sumBy(netStandingByAssetTypeOn, (o: any) => o.totalUSD), 2)
}

export const getNetStanding = async (
  assetTotal: AssetTotal,
  date: string
) => {
  const result = [];
  for (const asset of Object.keys(assetTotal)) {
    //return Object.keys(assetTotal).map(async (asset: string) => {
    let price = Number(await getPrice(asset, date, cache));
    let total = assetTotal[asset][0] + assetTotal[asset][1] - assetTotal[asset][2]
    result.push({
      assetType: asset,
      total: total,
      totalUSD: price * total,
    });
  }
  return result;
}

export const getAssetType = (
  chainEvent: CallData | TransactionData,
  addressBookByCategory: AddressBookByCategory
) => {
  if ((chainEvent as any).contractAddress) {
    if((chainEvent as CallData).contractAddress === NULL_ADDRESS)
      return 'ETH'
    else if(addressBookByCategory['erc20'][(chainEvent as CallData).contractAddress])
      return addressBookByCategory['erc20'][(chainEvent as CallData).contractAddress].name
  } else if(chainEvent.value !== '0.0')
      return 'ETH'

  return 'unknown'
}

export const getAllAssetTypes = (
  eventByCategory: EventByCategoryPerAssetType
) => {
  let merged = [] as Array<string>;
  _.forEach(Object.keys(eventByCategory), (category: string) => {
    if (eventByCategory[category] && Object.keys(eventByCategory[category]).length > 0)
      merged = mergeArray(merged, Object.keys(eventByCategory[category]))
  });

  return merged
}

export const getEventCategoryByAssetType = (
  allEvent: Array<Event>
): EventByCategoryPerAssetType | null => {
  if (!allEvent) return null;

  let temp1 = _.groupBy(allEvent, (event: Event) => event.category)

  let temp2 = {} as EventByCategoryPerAssetType;
  Object.keys(temp1).forEach((key: string) => {
    temp2[key] = _.groupBy(temp1[key], 'type');
  })

  return temp2;
}

export const getCategory = (
  src: string,
  dst: string,
  addressBookByCategory: AddressBookByCategory
) => {
  src = src.toLowerCase();
  dst = dst.toLowerCase();

  if (
    addressBookByCategory['self'][src] &&
    addressBookByCategory['self'][dst]
  ) return 'unknown';
  if (addressBookByCategory['self'][src]) {
    if (
      addressBookByCategory['friend'][dst] ||
      addressBookByCategory['family'][dst]
    ) return 'giftGiven';
    if (addressBookByCategory['erc20'][dst]) return 'supply';
    if (isProxy(addressBookByCategory, dst)) return 'supply';
    if (isExchange(addressBookByCategory, dst)) return 'swapOut';
    if (isDefi(addressBookByCategory, dst)) return 'supply';
    return 'expense';
  } else if (addressBookByCategory['self'][dst]) {
    if (
      addressBookByCategory['friend'][src] ||
      addressBookByCategory['family'][src]
    ) return 'giftReceived';
    if (addressBookByCategory['erc20'][src]) return 'withdraw';
    if (isProxy(addressBookByCategory, src)) return 'withdraw';
    if (isExchange(addressBookByCategory, src)) return 'swapIn';
    if (isDefi(addressBookByCategory, src)) return 'withdraw';
    return 'income';
  }
  return 'unknown';
}

export const getAllEvent = async (
  data: ChainData,
  addressBook: AddressBook
) => {

  let addressBookByCategory = getAddressBookByCategory(addressBook);
  let allEvent = [] as Promise<Event|null>[];
  let allEvent2 = [] as Promise<Event|null>[];

  if (data.calls) {
    allEvent = data.calls.map(async (call: CallData) => {
        return await createEventFromCallData(call, addressBookByCategory)
      })
  }

  if(data.transactions) {
    allEvent2 = _.flatten(Object.values(data.transactions).map(async (txn: TransactionData) => {
      let temp1 = [] as any;
      if (txn.logs && txn.logs.length > 0) {
        temp1 = _.compact(await Promise.all(txn.logs.map(async (log: TransactionLog) => {
          let event = await createEventFromLog(addressBookByCategory, log, txn)
          if (event)
            return event
        })))
      }
      let event = await createEventFromTransactionData(txn, addressBookByCategory)
      if (event && temp1.length > 0) return temp1.concat(event)
      else if (event) return event
      else if(temp1.length > 0) return temp1
    }));
  }

  const resolvedAllEvent = _.compact(_.flatten(((await Promise.all(allEvent)).concat(await Promise.all(allEvent2)))));
  return sortAllEventByDate(resolvedAllEvent);
}

export const getAddressBookByCategory = (addressBook: AddressBook) => {
  if (addressBookByCategory) return addressBookByCategory;

  let temp2 = {} as {[category: string]: any};
  _.forEach(
    _.groupBy(addressBook, (o) => o.category),
    (value, key) => {
      temp2[key] = _.keyBy(value, 'address');
    })
  return temp2;
}

export const getFilteredChainData = (
  personal: any,
  chainData: ChainData
) => {
  //filterEventsByTx(personal.events as Array<Event>, chainData);
  //filterEventsByAddress(personal.addressBook as AddressBook, chainData);
  filterEventsByNoTaxLiability(personal.addressBook as AddressBook, chainData);
  return chainData;
}
