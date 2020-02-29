import { AddressZero } from "ethers/constants";
import { Interface, formatEther, EventDescription } from "ethers/utils";
import { abi as tokenAbi } from "@openzeppelin/contracts/build/contracts/ERC20.json";

import { CallData, InputData, Event, TransactionData } from "../types";
import { Logger, eq } from "../utils";
import { getCategory, getDescription } from "./utils";
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

  const isTagged = (address: string | null, tag: string): boolean =>
    address && input.addressBook
      .filter(a => a.tags.includes(tag))
      .map(a => a.address.toLowerCase())
      .includes(address.toLowerCase());

  const isSelf = (address: string | null): boolean => isCategory(address, "self");

  const shouldIgnore = (address: string | null): boolean => isTagged(address, "ignore");

  const pretty = (address: string): string =>
    getName(address) || (isSelf(address) ? "self" : address.substring(0, 10));

  return (call: CallData): any => {
    const log = new Logger(`EthCall ${call.hash.substring(0, 10)}`, input.logLevel);

    if (shouldIgnore(call.from)) {
      log.debug(`Skipping call from ignored address ${pretty(call.from)}`);
      return null;
    }
    if (shouldIgnore(call.to)) {
      log.debug(`Skipping call to ignored address ${pretty(call.to)}`);
      return null;
    }

    const type = call.contractAddress
      ? isCategory(call.contractAddress, "erc20")
        ? getName(call.contractAddress)
        : null
      : "ETH";

    if (!type) {
      log.debug(`Skipping unsupported token: ${call.contractAddress}`);
      return null;
    }

    const event = {
      assetsIn: [],
      assetsOut: [],
      date: call.timestamp,
      from: pretty(call.from),
      hash: call.hash,
      source: type === "ETH" ? "ethCall" : "tokenCall",
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

    if (!type) {
      log.debug(`Token contract ${call.contractAddress} is not supported`);
      return null;
    }

    // assetsIn
    if (call.value !== "0.0" && isSelf(call.to) && !isSelf(call.from)) {
      log.debug(`Recieved ${call.value} ${type} from ${pretty(call.from)} via call`);
      event.assetsIn.push({ amount: call.value, type });
    // assetsOut
    } else if (call.value !== "0.0" && !isSelf(call.to) && isSelf(call.from)) {
      log.debug(`Sent ${call.value} ${type} to ${pretty(call.to)}`);
      event.assetsOut.push({ amount: call.value, type });
    } else {
      throw new Error(`Idk how to parse call: ${JSON.stringify(call)}`);
    }

    if (isTagged(call.to, "defi")) {
      event.tags.push("defi");
    }

    event.category = getCategory(event, log);
    event.description = getDescription(event, log);
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

  const isTagged = (address: string | null, tag: string): boolean =>
    address && input.addressBook
      .filter(a => a.tags.includes(tag))
      .map(a => a.address.toLowerCase())
      .includes(address.toLowerCase());

  const shouldIgnore = (address: string | null): boolean => isTagged(address, "ignore");

  const isSelf = (address: string | null): boolean => isCategory(address, "self");

  const pretty = (address: string): string =>
    getName(address) || (isSelf(address) ? "self" : address.substring(0, 10));

  const getEvents = (abi: any): EventDescription[] => Object.values((new Interface(abi)).events);

  const tokenEvents =
    Object.values(getEvents(tokenAbi).concat(getEvents(wethAbi)).concat(getEvents(saiAbi)));

  return (tx: TransactionData): Event | null => {
    const log = new Logger(`EthTx ${tx.hash.substring(0, 10)}`, input.logLevel);
    // if (tx.hash.startsWith("0x37f4fb")) { log.setLevel(5); } else { log.setLevel(3); }

    if (shouldIgnore(tx.from)) {
      log.debug(`Skipping tx from ignored address ${pretty(tx.from)}`);
      return null;
    }
    if (shouldIgnore(tx.to)) {
      log.debug(`Skipping tx to ignored address ${pretty(tx.to)}`);
      return null;
    }

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

    if (isTagged(tx.to, "defi")) {
      event.tags.push("defi");
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
          log.debug(`Deposited ${amount} ${assetType}`);
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

    event.tags = Array.from(new Set(event.tags));
    event.category = getCategory(event, log);
    event.description = getDescription(event, log);

    event.description !== "null"
      ? log.info(event.description)
      : log.debug(event.description);

    return event;
  };
};
