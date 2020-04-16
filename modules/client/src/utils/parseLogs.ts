import {
  TransactionData,
} from "@finances/types";

import {
  AddressBookByCategory,
  TransactionLog,
} from '../types';

import {
  NULL_ADDRESS,
  addressToName,
  isDefi,
  isProxy,
  isExchange,
  isUpgrade,
} from './utils';

import {
  EventDescription,
  Interface,
  bigNumberify,
  formatEther,
  formatUnits,
} from "ethers/utils";
import { abi as tokenAbi } from "@openzeppelin/contracts/build/contracts/ERC20.json";
import {
  cEthAbi,
  compoundMoneyMarketAbi,
  daiJoinAbi,
  matchingMarketAbi,
  saiAbi,
  vatAbi,
  wethAbi,
} from "../abi";

//const supportedAsset = ["WETH", "DAI", "SAI", "SNT"]
const getEvents = (abi: any): EventDescription[] => Object.values((new Interface(abi)).events);
const tokenEvents =
  Object.values(getEvents(tokenAbi)
    .concat(getEvents(wethAbi))
    .concat(getEvents(saiAbi)));

const exchangeEvents = Object.values(getEvents(matchingMarketAbi));

const defiEvents = 
  Object.values(getEvents(compoundMoneyMarketAbi))
  .concat(getEvents(cEthAbi));

const vatI = new Interface(vatAbi).functions;
const daiJoinI = new Interface(daiJoinAbi).functions;

export const findTxLogCategory = (
  addressBookByCategory: AddressBookByCategory,
  txLog: TransactionLog,
  txn: TransactionData
) => {
  const eventI = tokenEvents.find(e => e.topic === txLog.topics[0]);
  let category = "unknown";
  let quantity = "0";
  let assetType = "unknown";

  if (eventI) {
    let data = eventI.decode(txLog.data, txLog.topics);
    if (!addressBookByCategory['erc20'][txLog.address.toLowerCase()]) {
      return {category, assetType, quantity};
    }
    assetType = addressToName(addressBookByCategory, txLog.address.toLowerCase());
    quantity = formatEther(data.value || data.wad || "0");

    if (assetType === "WETH") {
      if (eventI.name === "Deposit") { 
        let dst = '0x' + txLog.topics[1].slice(26,).toLowerCase()
        if (addressBookByCategory['self'][dst] || isProxy(addressBookByCategory, dst)) 
          category = "deposit"
      }
      else if (eventI.name === "Withdrawal") { category = "cashout" }

      else if (eventI.name === "Transfer") {
        let src = addressToName(addressBookByCategory, '0x' + txLog.topics[1].slice(26,).toLowerCase())
        let dst = addressToName(addressBookByCategory, '0x' + txLog.topics[2].slice(26,).toLowerCase())
        if (src === "makerdao-v1-tub")
          category = "withdraw";
        else if (dst === "makerdao-v1-tub")
          category = "supply";
      }
    } else if (assetType === "SAI") {
      if (eventI.name === "Mint") { category = "borrow" }
      else if (eventI.name === "Burn") { category = "repay" }
    }

    if (category === "unknown" && eventI.name === "Transfer") {
      let src = '0x' + txLog.topics[1].slice(26,).toLowerCase()
      let dst = '0x' + txLog.topics[2].slice(26,).toLowerCase()
      if (src === NULL_ADDRESS || dst === NULL_ADDRESS) {
        console.log(assetType);
        category = 'unknown';
      }
      else if (
        addressBookByCategory['self'][src] &&
        addressBookByCategory['self'][dst]
      ) category = 'unknown';
      
      else if (
        (isProxy(addressBookByCategory, dst) ||
        addressBookByCategory['self'][dst]) &&
        !(addressBookByCategory['self'][src] ||
          isProxy(addressBookByCategory, src))
      ) {
        if (isDefi(addressBookByCategory, src)) {
          if (
            addressBookByCategory['erc20'][src] ||
            isUpgrade(addressBookByCategory, src)
          ) category = "withdraw";
        } else {
          if (
            (isExchange(addressBookByCategory, src) ||
            isExchange(addressBookByCategory, txn.to!)) &&
            !isProxy(addressBookByCategory, txn.to!)
          ) category = 'swapIn';
          else if (
            addressBookByCategory['friend'][src] ||
            addressBookByCategory['family'][src]
          ) category = 'giftReceived';
          else if (!isProxy(addressBookByCategory, txn.to!))
            category = 'income';
        }
      } else if (
        (isProxy(addressBookByCategory, src) ||
          addressBookByCategory['self'][src]) &&
          !(addressBookByCategory['self'][dst] ||
          isProxy(addressBookByCategory, dst))
      ) {
        if (isDefi(addressBookByCategory, dst)) {
          if (assetType === "MKR") category = "expense";
          else if (addressBookByCategory['erc20'][dst]) category = "supply";
        } else {
          if (
            (isExchange(addressBookByCategory, dst) ||
            isExchange(addressBookByCategory,txn.to!)) &&
            !isProxy(addressBookByCategory, txn.to!)
          ) category = 'swapOut';
          else if (
            addressBookByCategory['friend'][dst] ||
            addressBookByCategory['family'][dst]
          ) category = "giftGiven";
          else if (!isProxy(addressBookByCategory, txn.to!))
            category = "expense";
        }
      }
    }
  }
  return {category, assetType, quantity} ;
}

export const findExchangeCategory = (
  addressBookByCategory: AddressBookByCategory,
  txLog: TransactionLog
) => {
  let category = "unknown";
  let quantity = "0";
  let assetType = "unknown";

  const eventD = exchangeEvents.find(e => e.topic === txLog.topics[0]);
  if (eventD) {
    let data = eventD.decode(txLog.data, txLog.topics);
    if (eventD.name === 'LogTrade') {
      assetType = addressToName(addressBookByCategory, '0x'+ txLog.topics[2].slice(26,).toLowerCase());
      category = 'swapOut'
      quantity = formatEther(data.buy_amt || "0");
    } else if (eventD.name === 'LogTake') {
      assetType = addressToName(addressBookByCategory, data.pay_gem.toLowerCase())
      category = 'swapIn';
      //fromName = addressToName(addressBookByCategory, chainEvent.to)
      quantity = formatEther(data.take_amt || "0");
      //toName = addressToName(addressBookByCategory, chainEvent.from)
    }
  }

  return {category, assetType, quantity} ;
}

export const findDefiCategory = (
  addressBookByCategory: AddressBookByCategory,
  txLog: TransactionLog
) => {
  let category = "unknown";
  let quantity = "0";
  let assetType = "unknown";

  if (addressToName(addressBookByCategory, txLog.address) === "maker-core-vat") {
    if (txLog.topics[0].slice(0,10) === vatI.move.sighash) {
      let name1 = addressToName(addressBookByCategory, '0x'+ txLog.topics[1].slice(26,));
      let name2 = addressToName(addressBookByCategory, '0x'+ txLog.topics[2].slice(26,));


      if (name1 === "maker-pot" && name2 === "cdp-proxy") { category = "withdraw" }
      else if (name1 === "cdp"  && name2 === "cdp-proxy") { category = "borrow" }
      else if (name1 === "maker-dai-join" && name2 === "cdp") { category = "repay" }
      else if (name1 === "cdp-proxy" && name2 === "maker-pot") { category = "supply" }
      if (category !== 'unknown') {
        quantity = formatUnits(bigNumberify(txLog.topics[3]), 45)
        assetType = "DAI";
      }
    }
  } else if (addressToName(addressBookByCategory, txLog.address) === "maker-dai-join") {
    if (txLog.topics[0].slice(0,10) === daiJoinI.exit.sighash) {
      let add1 = '0x'+ txLog.topics[1].slice(26,).toLowerCase();
      let add2 = '0x'+ txLog.topics[2].slice(26,).toLowerCase();
      assetType = "DAI";
      quantity = formatEther(bigNumberify(txLog.topics[3]));

      if(
        addressToName(addressBookByCategory, add1) === "scdmcdmigration" && 
        addressBookByCategory['self'][add2] !== undefined
      ) category = "swapIn";
      else if (
        addressBookByCategory['erc20'][add1] &&
        isDefi(addressBookByCategory, add1) &&
        addressBookByCategory['self'][add2]
      ) category = "withdraw"
    }
  } else {
    const event = defiEvents.find(e => e.topic === txLog.topics[0]);
    if (event) {
      let data = event.decode(txLog.data, txLog.topics);
      assetType = addressToName(addressBookByCategory, data.asset)
      quantity = formatEther(data.amount || "0");
      if (event.name === "RepayBorrow") {
        category = "repay";
      } else if (event.name === "Borrow") {
        category = "borrow";
      } else if (event.name === "SupplyReceived") {
        category = "supply";
      } else if (event.name === "SupplyWithdrawn") {
        category = "withdraw";
      } else if (event.name === "BorrowTaken") {
        category = "borrow";
      } else if (event.name === "BorrowRepaid") {
        category = "repay";
      } else if (event.name === "LogNote") {
        console.log(txLog, event)
      }
    }
  }

  return {category, assetType, quantity} ;
}
