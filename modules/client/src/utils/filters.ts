import _ from "lodash";
import {
  CallData,
  ChainData,
  TransactionData,
} from "@finances/types";

import {
  AddressBook,
  Event,
} from "../types";
import {
  NULL_ADDRESS,
} from "./utils"

import {
  getAddressBookByCategory,
} from "./getters";

export const filterEventByCategory = (
  allEvent: Array<Event>,
  category: string
) => {
  return _.compact( _.filter(allEvent, (event: Event) => {
    if(event.category === category) {
      return true
    }
    return false
  }))
}

export const filterEventsByTx = (
  events: Array<string | Event>,
  chainData: ChainData
) => {
  
  let eventsToIgnore = _.keyBy(
    _.filter(
      events,
      (o: string | Event) => {
        if ( typeof(o) == "object" && o.tags && o.tags.indexOf("ignore") >= 0)
          return true;
        return false;
      }),
    'hash'
    );

  const filterByHash = (hash: string) => {
    if (eventsToIgnore[hash]) return false;
    return true
  }

  // Ignore all the calls with ignore tags
  chainData.calls = _.filter( chainData.calls, (o: CallData) => filterByHash(o.hash));

  // Ignore all the txns with ignore tags
  chainData.transactions = _.filter(
    chainData.transactions,
    (o: TransactionData) => filterByHash(o.hash)
  );
}

export const filterEventsByAddress = (
  addressBook: AddressBook,
  chainData: ChainData
) => {

  let addressToIgnore = _.keyBy(
    _.filter(
      addressBook,
      (o: any) => {
        if ( o.tags.indexOf("ignore") >= 0)
          return true;
        return false;
      }),
    'address'
    );

  const filterByAddress = (o: TransactionData | CallData) => {
    if(!o.to) return false;
    if (addressToIgnore[o.to.toLowerCase()] || addressToIgnore[o.from.toLowerCase()]) return false;
    return true
  }

  // Ignore calls to/from Addresses with Ignore tag
  chainData.calls = _.filter( chainData.calls, (o: CallData) => filterByAddress(o));


  // Ignore txns to/from Addresses with Ignore tag
  chainData.transactions = _.filter(
    chainData.transactions,
    (o: TransactionData) => filterByAddress(o)
  );
}

export const filterEventsByNoTaxLiability = (
  addressBook: AddressBook,
  chainData: ChainData
) => {

  const addressBookByCategory = getAddressBookByCategory(addressBook)

  const filterNonTaxableEvents = (
    event: CallData | TransactionData,
  ) => {
    // Skip contract creation calls
    if (!event.to) return false;

    // Skip revert txn
    if ((event as any).status && (event as TransactionData).status === 0) return false;

    let to = event.to.toLowerCase();
    let from = event.from.toLowerCase();
    
    // Skip non-taxable self
    if (addressBookByCategory['self'][to] && addressBookByCategory['self'][from]) return false;

    // Don't skip Erc20 txn that have logs
    if (addressBookByCategory['erc20'][to] || addressBookByCategory['erc20'][from]) {
      //@ts-ignore
      if ((event as any).logs && (event as TransactionData).logs.length > 0)
        return true;
    }

    if (event.value === '0.0') {
      if (!(event as any).logs) return false;
      //@ts-ignore
      else if ((event as TransactionData).logs.length === 0) return false;
    }

    // Skip redundant erc20 transfer calls
    if ((event as any).contractAddress && (event as CallData).contractAddress !== NULL_ADDRESS) {
      return false;
    }

    return true;
  }

  chainData.calls = _.filter( chainData.calls, (o: CallData) => filterNonTaxableEvents(o));

  chainData.transactions = _.filter(
    chainData.transactions,
    (o: TransactionData) => filterNonTaxableEvents(o)
  );
}

export const filterEventsByDate = (
  startDate: string,
  endDate: string,
  allEvent: Array<Event>
) => {

  const filterByDate = (
    event: Event,
  ) => {
      return (event.date >= startDate && event.date <= endDate)
  }

  return _.filter(allEvent, (o: Event) => filterByDate(o));
}

export const filterAddressByCategory = (addressBook: AddressBook, category: string) => {
  return _.keyBy(
    _.filter(addressBook, ['category', category]),
    'address'
  );
}
