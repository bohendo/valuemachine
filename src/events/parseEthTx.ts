import { AddressZero } from "ethers/constants";
import { Interface, formatEther, EventDescription } from "ethers/utils";
import { abi as tokenAbi } from "@openzeppelin/contracts/build/contracts/ERC20.json";

import { getAddressBook } from "../addressBook";
import { env } from "../env";
import { CallData, InputData, Event, TransactionData } from "../types";
import { Logger, eq } from "../utils";
import { getDescription } from "./utils";
import { saiAbi, wethAbi } from "../abi";

export const parseEthCallFactory = (input: InputData): any =>
  (call: CallData): any => {
    const {
      getName,
      isCategory,
      isSelf,
      isTagged,
      pretty,
      shouldIgnore,
    } = getAddressBook(input);
    const log = new Logger(`EthCall ${call.hash.substring(0, 10)}`, env.logLevel);

    if (shouldIgnore(call.from)) {
      log.debug(`Skipping call from ignored address ${pretty(call.from)}`);
      return null;
    }

    if (shouldIgnore(call.to)) {
      log.debug(`Skipping call to ignored address ${pretty(call.to)}`);
      return null;
    }

    const assetType = call.contractAddress
      ? isCategory(call.contractAddress, "erc20")
        ? getName(call.contractAddress)
        : null
      : "ETH";

    if (!assetType) {
      log.debug(`Skipping unsupported token: ${call.contractAddress}`);
      return null;
    }

    const event = {
      assetsIn: [],
      assetsOut: [],
      date: call.timestamp,
      from: pretty(call.from),
      hash: call.hash,
      sources: new Set([assetType === "ETH" ? "ethCall" : "tokenCall"]),
      tags: new Set(),
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

    if (!assetType) {
      log.debug(`Token contract ${call.contractAddress} is not supported`);
      return null;
    }

    // assetsIn
    if (call.value !== "0.0" && isSelf(call.to) && !isSelf(call.from)) {
      log.debug(`Recieved ${call.value} ${assetType} from ${pretty(call.from)} via call`);
      event.assetsIn.push({ assetType, quantity: call.value });
    // assetsOut
    } else if (call.value !== "0.0" && !isSelf(call.to) && isSelf(call.from)) {
      log.debug(`Sent ${call.value} ${assetType} to ${pretty(call.to)}`);
      event.assetsOut.push({ assetType, quantity: call.value });
    } else {
      throw new Error(`Idk how to parse call: ${JSON.stringify(call)}`);
    }

    if (isTagged(call.to, "defi")) {
      event.tags.add("defi");
    }

    event.description = getDescription(event);
    log.info(event.description);
    return event;
  };

export const parseEthTxFactory = (input: InputData): any =>
  (tx: TransactionData): Event | null => {
    const {
      getName,
      isCategory,
      isSelf,
      isTagged,
      pretty,
      shouldIgnore,
    } = getAddressBook(input);
    const getEvents = (abi: any): EventDescription[] => Object.values((new Interface(abi)).events);
    const tokenEvents =
      Object.values(getEvents(tokenAbi).concat(getEvents(wethAbi)).concat(getEvents(saiAbi)));

    const log = new Logger(`EthTx ${tx.hash.substring(0, 10)}`, env.logLevel);
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
      prices: {},
      sources: new Set(["ethTx"]),
      tags: new Set(),
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
      event.assetsIn.push({ assetType: "ETH", quantity: tx.value });
    }

    // ETH out
    if (tx.value !== "0.0" && !isSelf(tx.to) && isSelf(tx.from)) {
      log.debug(`Sent ${tx.value} ETH to ${pretty(tx.to)}`);
      event.assetsOut.push({ assetType: "ETH", quantity: tx.value });
    }

    if (isTagged(tx.to, "defi")) {
      event.tags.add("defi");
    }

    for (const txLog of tx.logs) {
      if (isCategory(txLog.address, "erc20")) {
        const assetType = getName(txLog.address).toUpperCase();
        const eventI = tokenEvents.find(e => e.topic === txLog.topics[0]);
        if (eventI && eventI.name === "Transfer") {
          const data = eventI.decode(txLog.data, txLog.topics);
          const quantity = formatEther(data.value);
          if (quantity === "0.0") {
            log.debug(`Skipping zero-value ${assetType} transfer`);
            continue;
          }
          if (isSelf(data.to) && isSelf(data.from)) {
            log.debug(`Skipping self-to-self ${assetType} transfer`);
          } else if (!isSelf(data.to) && isSelf(data.from)) {
            event.assetsOut.push({ assetType, quantity });
            if (data.to === AddressZero && assetType === "DAI") {
              event.to = "CDP";
              event.tags.add("cdp");
            } else {
              event.to = event.to === pretty(tx.to) ? pretty(data.to) : event.to;
            }
            log.debug(`Sent ${quantity} ${assetType} to ${event.to}`);
          } else if (isSelf(data.to) && !isSelf(data.from)) {
            event.assetsIn.push({ assetType, quantity });
            if (data.from === AddressZero && assetType === "DAI") {
              event.from = "CDP";
              event.tags.add("cdp");
            } else {
              event.from = event.from === pretty(tx.from) ? pretty(data.from) : event.from;
            }
            log.debug(`Recieved ${quantity} ${assetType} from ${event.from}`);
          } else {
            log.debug(`Skipping external-to-external ${assetType} transfer`);
          }
        } else if (eventI && eventI.name === "Deposit") {
          const data = eventI.decode(txLog.data, txLog.topics);
          const quantity = formatEther(data.wad);
          log.debug(`Deposited ${quantity} ${assetType}`);
          event.assetsIn.push({ assetType, quantity });
        } else if (eventI && eventI.name === "Withdrawal") {
          const data = eventI.decode(txLog.data, txLog.topics);
          const quantity = formatEther(data.wad);
          log.debug(`Withdrew ${quantity} ${assetType} for ETH`);
          event.assetsOut.push({ assetType, quantity });
        } else if (eventI && eventI.name === "Mint") {
          const data = eventI.decode(txLog.data, txLog.topics);
          const quantity = formatEther(data.wad);
          log.debug(`Minted ${quantity} ${assetType}`);
          event.assetsIn.push({ assetType, quantity });
          event.from = assetType === "SAI" ? "CDP" : event.from;
          event.tags.add("cdp");
        } else if (eventI && eventI.name === "Burn") {
          const data = eventI.decode(txLog.data, txLog.topics);
          const quantity = formatEther(data.wad);
          log.debug(`Burnt ${quantity} ${assetType}`);
          event.assetsOut.push({ assetType, quantity });
          event.to = assetType === "SAI" ? "CDP" : event.to;
          event.tags.add("cdp");
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

    event.description = getDescription(event);

    event.description !== "null"
      ? log.info(event.description)
      : log.debug(event.description);

    return event;
  };
