import _ from 'lodash';
import {
  AddressBookByCategory,
} from '../types';

export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
export const In = ["swapIn", "income", "borrow", "deposit", "withdraw", "giftReceived"] 

export const Out = ["swapOut", "expense", "supply", "cashout", "repay", "giftGiven"]

const INDENT = 5;

export const sumByToken = (token: string, total: any) => {
  // @ts-ignore
  if (!total || !total[token]) return 0;
  return _.sumBy(total[token], (o: any) => Number(o.amount))
}

export const mergeArray = (a1: Array<string>, a2: Array<string>) => {
  return _.uniq(_.concat(a1, a2));
}

export const isDefi = (
  addressBookByCategory: AddressBookByCategory,
  add: string
) => {
  if (add) {
    add = add.toLowerCase();
    if (
      (
        addressBookByCategory['public'][add] &&
        _.includes(addressBookByCategory['public'][add].tags, "defi")
      ) ||
      (
        addressBookByCategory['erc20'][add] &&
        _.includes(addressBookByCategory['erc20'][add].tags, "defi")
      ) ||
      (
        addressBookByCategory['private'][add] &&
        _.includes(addressBookByCategory['private'][add].tags, "defi")
      )
    ) return true;
  }
  return false;
}

export const isExchange = (
  addressBookByCategory: AddressBookByCategory,
  add: string
) => {
  if (add) {
    add = add.toLowerCase();
    return (
      (
        addressBookByCategory['public'][add] &&
        _.includes(addressBookByCategory['public'][add].tags, "exchange")
      ) ||
      (
        addressBookByCategory['private'][add] &&
        _.includes(addressBookByCategory['private'][add].tags, "exchange")
      )) || false;
  }
  return false;
}

export const isUpgrade = (
  addressBookByCategory: AddressBookByCategory,
  add: string
) => {
  if (add) {
    add = add.toLowerCase();
    return (
      (
        addressBookByCategory['public'][add] &&
        _.includes(addressBookByCategory['public'][add].tags, "upgrade")
      ) ||
      (
        addressBookByCategory['private'][add] &&
        _.includes(addressBookByCategory['private'][add].tags, "upgrade")
      )) || false;
  }
  return false;
}

export const isProxy = (
  addressBookByCategory: {[category: string]: any},
  add: string
) => {
  if (add) {
    add = add.toLowerCase();
    if (
      (
        addressBookByCategory['public'][add] &&
        _.includes(addressBookByCategory['public'][add].tags, "proxy")
      ) ||
      (
        addressBookByCategory['private'][add] &&
        _.includes(addressBookByCategory['private'][add].tags, "proxy")
      )
    ) return true;
  }
  return false;
}

export const addressToName = (
  addressBookByCategory: {[category: string]: any},
  address: string | null
) => {
  if (!address) return;
  let add = address.toLowerCase();
  if (
    addressBookByCategory['erc20'][add] ||
    addressBookByCategory['self'][add] ||
    addressBookByCategory['public'][add] ||
    addressBookByCategory['private'][add] ||
    addressBookByCategory['family'][add] ||
    addressBookByCategory['friend'][add]
  )
    return (
      addressBookByCategory['erc20'][add] ||
      addressBookByCategory['self'][add] ||
      addressBookByCategory['public'][add] ||
      addressBookByCategory['private'][add] ||
      addressBookByCategory['family'][add] ||
      addressBookByCategory['friend'][add]
    ).name;

  return add;
}

export const getCoordinates = (startAngle: number, endAngle: number, maxRadius: number) => {
  const angle = startAngle + (endAngle - startAngle) / 2;
  return {
    x: (maxRadius + INDENT) * Math.sin(angle),
    y: (maxRadius + INDENT) * Math.cos(angle)
  };
};

export const sortAllEventByDate = (allEvent: any) => {
  return _.flatten(_.orderBy(allEvent, (o: any) => {return o.date}, ['asc']))
}
