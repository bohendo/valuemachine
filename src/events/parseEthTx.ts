import { AddressZero } from "ethers/constants";
import { Interface, formatEther, EventDescription } from "ethers/utils";
import { abi as tokenAbi } from "@openzeppelin/contracts/build/contracts/ERC20.json";

import { CallData, InputData, Event, TransactionData } from "../types";
import { Logger, addAssets, eq, round } from "../utils";
import wethAbi from "./wethAbi.json";
import saiAbi from "./saiAbi.json";

export const parseEthCallFactory = (input: InputData): any => {

  const getName = (address: string | null): string => !address ? "" :
    input.addressBook.find(a => a.address.toLowerCase() === address.toLowerCase()) ?
    input.addressBook.find(a => a.address.toLowerCase() === address.toLowerCase()).name : "";

  const isCategory = (address: string | null, category: string): boolean =>
    address && input.addressBook
      .filter(a => a.category.toLowerCase() === category.toLowerCase())
      .map(a => a.address.toLowerCase())
      .includes(address.toLowerCase());

  const isSelf = (address: string | null): boolean => isCategory(address, "self");

  const pretty = (address: string): string =>
    getName(address) || (isSelf(address) ? "self" : address.substring(0, 10));

  return (call: CallData): any => {
    const log = new Logger(`EthCall ${call.hash.substring(0, 10)}`, input.logLevel);

    const event = {
      assetsIn: [],
      assetsOut: [],
      date: call.timestamp,
      from: pretty(call.from),
      hash: call.hash,
      source: "ethCall",
      tags: [],
      to: pretty(call.to),
    } as Event;

    if (isSelf(call.to) && isSelf(call.from)) {
      log.debug(`Skipping simple self-to-self ETH call`);
      return null;
    }
    if (!isSelf(call.to) && !isSelf(call.from)) {
      log.debug(`Skipping simple external-to-external ETH call`);
      return null;
    }
    if (eq(call.value, "0")) {
      log.debug(`Skipping simple zero-value ETH call`);
      return null;
    }

    // ETH in
    if (call.value !== "0.0" && isSelf(call.to) && !isSelf(call.from)) {
      log.debug(`Recieved ${call.value} ETH from ${pretty(call.from)}`);
      event.assetsIn.push({ amount: call.value, type: "ETH" });
      event.category = "income";
    } else if (call.value !== "0.0" && !isSelf(call.to) && isSelf(call.from)) {
      log.debug(`Sent ${call.value} ETH to ${pretty(call.to)}`);
      event.assetsOut.push({ amount: call.value, type: "ETH" });
      event.category = "expense";
    } else {
      throw new Error(`Idk how to parse call: ${JSON.stringify(call)}`);
    }

    const income = addAssets(event.assetsIn).map(a => `${round(a.amount)} ${a.type}`).join(", ");
    const expense = addAssets(event.assetsOut).map(a => `${round(a.amount)} ${a.type}`).join(", ");

    if (event.assetsIn.length === 0 && event.assetsOut.length === 0) {
      return null;
    } else if (event.assetsIn.length !== 0 && event.assetsOut.length === 0) {
      event.description = `${event.category} of ${income} from ${event.from}`;
    } else if (event.assetsIn.length === 0 && event.assetsOut.length !== 0) {
      event.description = `${event.category} of ${expense} to ${event.to}`;
    } else if (event.assetsIn.length !== 0 && event.assetsOut.length !== 0) {
      event.description = `${event.category} of ${expense} for ${income}`;
    }

    log.info(event.description);
    return event;
  };
};

export const parseEthTxFactory = (input: InputData): any => {

  const getName = (address: string | null): string => !address ? "" :
    input.addressBook.find(a => a.address.toLowerCase() === address.toLowerCase()) ?
    input.addressBook.find(a => a.address.toLowerCase() === address.toLowerCase()).name : "";

  const isCategory = (address: string | null, category: string): boolean =>
    address && input.addressBook
      .filter(a => a.category.toLowerCase() === category.toLowerCase())
      .map(a => a.address.toLowerCase())
      .includes(address.toLowerCase());

  const isSelf = (address: string | null): boolean => isCategory(address, "self");

  const pretty = (address: string): string =>
    getName(address) || (isSelf(address) ? "self" : address.substring(0, 10));

  const getEvents = (abi: any): EventDescription[] => Object.values((new Interface(abi)).events);

  const tokenEvents =
    Object.values(getEvents(tokenAbi).concat(getEvents(wethAbi)).concat(getEvents(saiAbi)));

  return (tx: TransactionData): Event | null => {
    const log = new Logger(`EthTx ${tx.hash.substring(0, 10)}`, input.logLevel);
    if (!tx.logs) {
      throw new Error(`Missing logs for tx ${tx.hash}, did fetchChainData get interrupted?`);
    }

    if (tx.to === null) {
      log.debug(`Skipping contract creation tx`);
      return null;
    }

    const event = {
      assetsIn: [],
      assetsOut: [],
      date: tx.timestamp,
      from: pretty(tx.from),
      hash: tx.hash,
      source: "ethTx",
      tags: [],
      to: pretty(tx.to),
    } as Event;

    if (tx.logs.length === 0) {
      if (isSelf(tx.to) && isSelf(tx.from)) {
        log.debug(`Skipping simple self-to-self ETH transfer`);
        return null;
      }
      if (!isSelf(tx.to) && !isSelf(tx.from)) {
        log.debug(`Skipping simple external-to-external ETH transfer`);
        return null;
      }
      if (eq(tx.value, "0")) {
        log.debug(`Skipping simple zero-value ETH transfer`);
        return null;
      }
    }

    // ETH in
    if (tx.value !== "0.0" && isSelf(tx.to) && !isSelf(tx.from)) {
      log.debug(`Recieved ${tx.value} ETH from ${pretty(tx.from)}`);
      event.assetsIn.push({ amount: tx.value, type: "ETH" });
      event.category = "income";
    }

    // ETH out
    if (tx.value !== "0.0" && !isSelf(tx.to) && isSelf(tx.from)) {
      log.debug(`Sent ${tx.value} ETH to ${pretty(tx.to)}`);
      event.assetsOut.push({ amount: tx.value, type: "ETH" });
      event.category = "expense";
    }

    for (const txLog of tx.logs) {
      if (isCategory(txLog.address, "erc20")) {
        const assetType = getName(txLog.address).toUpperCase();
        const eventI = tokenEvents.find(e => e.topic === txLog.topics[0]);
        if (eventI && eventI.name === "Transfer") {
          const data = eventI.decode(txLog.data, txLog.topics);
          const amount = formatEther(data.value);
          if (amount === "0.0") {
            log.debug(`Skipping zero-value ${assetType} transfer`);
            continue;
          }
          if (isSelf(data.to) && isSelf(data.from)) {
            log.debug(`Skipping self-to-self ${assetType} transfer`);
          } else if (!isSelf(data.to) && isSelf(data.from)) {
            event.assetsOut.push({ amount, type: assetType });
            if (data.to === AddressZero && assetType === "DAI") {
              event.to = "CDP";
              event.tags.push("cdp");
            } else {
              event.to = event.to === pretty(tx.to) ? pretty(data.to) : event.to;
            }
            log.debug(`Sent ${amount} ${assetType} to ${event.to}`);
          } else if (isSelf(data.to) && !isSelf(data.from)) {
            event.assetsIn.push({ amount, type: assetType });
            if (data.from === AddressZero && assetType === "DAI") {
              event.from = "CDP";
              event.tags.push("cdp");
            } else {
              event.from = event.from === pretty(tx.from) ? pretty(data.from) : event.from;
            }
            log.debug(`Recieved ${amount} ${assetType} from ${event.from}`);
          } else {
            log.debug(`Skipping external-to-external ${assetType} transfer`);
          }
        } else if (eventI && eventI.name === "Deposit") {
          const data = eventI.decode(txLog.data, txLog.topics);
          const amount = formatEther(data.wad);
          log.debug(`Deposited ETH for ${amount} ${assetType}`);
          event.assetsIn.push({ amount, type: assetType });
        } else if (eventI && eventI.name === "Withdrawal") {
          const data = eventI.decode(txLog.data, txLog.topics);
          const amount = formatEther(data.wad);
          log.debug(`Withdrew ${amount} ${assetType} for ETH`);
          event.assetsOut.push({ amount, type: assetType });
        } else if (eventI && eventI.name === "Mint") {
          const data = eventI.decode(txLog.data, txLog.topics);
          const amount = formatEther(data.wad);
          log.debug(`Minted ${amount} ${assetType}`);
          event.assetsIn.push({ amount, type: assetType });
          event.from = assetType === "SAI" ? "CDP" : event.from;
          event.tags.push("cdp");
        } else if (eventI && eventI.name === "Burn") {
          const data = eventI.decode(txLog.data, txLog.topics);
          const amount = formatEther(data.wad);
          log.debug(`Burnt ${amount} ${assetType}`);
          event.assetsOut.push({ amount, type: assetType });
          event.to = assetType === "SAI" ? "CDP" : event.to;
          event.tags.push("cdp");
        } else if (eventI && (eventI.name === "Withdrawal" || eventI.name === "Deposit")) {
          log.debug(`Skipping WETH Withdrawal/Deposit event`);
          continue; // Known & not needed, silently skip
        } else if (eventI && eventI.name === "Approval") {
          log.debug(`Skipping Approval event`);
          continue; // Known & not needed, silently skip
        } else if (eventI) {
          log.debug(`Unknown ${assetType} event: ${JSON.stringify(eventI)}`);
          continue;
        } else {
          log.debug(`Unable to decode ${assetType} event: ${txLog.topics[0]}`);
        }
      }
    }

    const income = addAssets(event.assetsIn).map(a => `${round(a.amount)} ${a.type}`).join(", ");
    const expense = addAssets(event.assetsOut).map(a => `${round(a.amount)} ${a.type}`).join(", ");

    if (event.assetsIn.length === 0 && event.assetsOut.length === 0) {
      return null;
    } else if (event.assetsIn.length !== 0 && event.assetsOut.length === 0) {
      event.category = event.tags.includes("cdp") ? "borrow" : "income";
      event.description = `${event.category} of ${income} from ${event.from}`;
    } else if (event.assetsIn.length === 0 && event.assetsOut.length !== 0) {
      event.category = event.tags.includes("cdp") ? "repayment" : "expense";
      event.description = `${event.category} of ${expense} to ${event.to}`;
    } else if (event.assetsIn.length !== 0 && event.assetsOut.length !== 0) {
      event.category = "swap";
      event.description = `${event.category} of ${expense} for ${income}`;
    }

    log.info(`${event.description}`);
    return event;
  };
};
