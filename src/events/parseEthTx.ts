import { Interface, formatEther } from "ethers/utils";
import tokenAbi from "human-standard-token-abi";

import { InputData, Event, TransactionData, TransactionLog } from "../types";
import { Logger, add, eq, gt, lt, mul, round, sub } from "../utils";

const lowerCaseKeys = (obj: object): object => {
  const output = {};
  Object.entries(obj).forEach(entry => {
    output[entry[0].toLowerCase()] = entry[1];
  });
  return output;
};

export const parseEthTxFactory = (input: InputData) => {
  const log = new Logger("ParseEthTx", input.logLevel);
  const addressBook = lowerCaseKeys(input.addressBook) as { [key: string]: string; };
  const tokens = lowerCaseKeys(input.supportedERC20s) as { [key: string]: string; };
  const tokenI = new Interface(tokenAbi);

  const isSelf = (address: string | null) =>
    address && input.ethAddresses.map(a => a.toLowerCase()).includes(address.toLowerCase());

  const pretty = (address: string): string =>
    addressBook[address.toLowerCase()] || (isSelf(address) ? "self" : address.substring(0, 10));

  // topic 0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c:
  // Deposit (index_topic_1 address dst, uint256 wad)

  // topic 0xcc16f5dbb4873280815c1ee09dbd06736cffcc184412cf7a71a0fdb75d397ca5
  // topic 0x7fcf532c15f0a6db0bd6d0e038bea71d30d808c7d98cb3bf7268a95bf5081b65

  const decodeEvent = (txLog: TransactionLog): any => {
  };

  return (tx: TransactionData): Event | null => {
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
      source: "ethereum",
      to: pretty(tx.to),
    } as Event;

    
    if (tx.logs.length === 0) {
      if (isSelf(tx.to) && isSelf(tx.from)) {
        log.debug(`Skipping simple tx that only contains self-to-self transfers`);
        return null;
      }
      if (isSelf(tx.to) && !isSelf(tx.from)) {
        log.debug(`Skipping simple tx that only contains self-to-self transfers`);
        return null;
      }
      if (eq(tx.value, "0")) {
        log.debug(`Skipping simple tx with zero-value`);
        return null;
      }
    }

    // ETH in
    if (tx.value !== "0.0" && isSelf(tx.to) && !isSelf(tx.from)) {
      log.debug(`${pretty(tx.hash)} Got income tx of ${tx.value} ETH from ${pretty(tx.from)}`);
      event.assetsIn.push({ amount: tx.value, type: "ETH" });
      event.category = "income";
    }

    // ETH out
    if (tx.value !== "0.0" && !isSelf(tx.to) && isSelf(tx.from)) {
      log.debug(`${pretty(tx.hash)} Got expense tx of ${tx.value} ETH to ${pretty(tx.to)}`);
      event.assetsOut.push({ amount: tx.value, type: "ETH" });
      event.category = "expense";
    }

    for (const txLog of tx.logs) {
      if (Object.keys(tokens).includes(txLog.address.toLowerCase())) {
        const assetType = tokens[txLog.address.toLowerCase()].toUpperCase();
        let eventI = Object.values(tokenI.events).find(e => e.topic === txLog.topics[0]);
        if (eventI && eventI.name === "Transfer") {
          const data = eventI.decode(txLog.data, txLog.topics);
          const amount = formatEther(data._value);
          if (amount === "0.0") {
            log.debug(`${pretty(tx.hash)} Skipping zero-value ${assetType} transfer`);
            continue;
          }
          if (isSelf(data._to) && isSelf(data._from)) {
            log.debug(`${pretty(tx.hash)} Skipping self-to-self ${assetType} transfer`);
          } else if (!isSelf(data._to) && isSelf(data._from)) {
            event.assetsOut.push({ amount, type: assetType });
            event.to = pretty(data._to);
            log.debug(`${pretty(tx.hash)} Got expense of ${amount} ${assetType} to ${event.to}`);
          } else if (isSelf(data._to) && !isSelf(data._from)) {
            event.assetsIn.push({ amount, type: assetType });
            event.from = pretty(data._from);
            log.debug(`${pretty(tx.hash)} Got income of ${amount} ${assetType} from ${event.from}`);
          } else {
            log.debug(`${pretty(tx.hash)} Skipping external-to-external ${assetType} transfer`);
          }
        } else if (eventI && eventI.name === "Approval") {
          continue; // Known & not needed, silently skip
        } else {
          log.debug(`${pretty(tx.hash)} Unknown event topic for ${assetType}: ${txLog.topics[0]}`);
        }
      }
    }

    const reduceSum = (acc, cur) => {
      acc[cur.type] = acc[cur.type] ? add([acc[cur.type], cur.amount]) : cur.amount;
      return acc;
    };

    const totalIncome = event.assetsIn.reduce(reduceSum , {});
    const totalExpense = event.assetsOut.reduce(reduceSum , {});
    const incomeStr = Object.entries(totalIncome)
      .map(e => `${round(e[1].toString())} ${e[0]}`).join(", ");
    const expenseStr = Object.entries(totalExpense)
      .map(e => `${round(e[1].toString())} ${e[0]}`).join(", ");

    if (event.assetsIn.length === 0 && event.assetsOut.length === 0) {
      return null;
    } else if (event.assetsIn.length !== 0 && event.assetsOut.length === 0) {
      event.description = `income of ${incomeStr} from ${event.from}`;
      event.category = "income";
    } else if (event.assetsIn.length === 0 && event.assetsOut.length !== 0) {
      event.description = `expense of ${expenseStr} to ${event.to}`;
      event.category = "expense";
    } else if (event.assetsIn.length !== 0 && event.assetsOut.length !== 0) {
      event.description = `swap of ${expenseStr} for ${incomeStr}`;
      event.category = "swap";
    }

    log.info(`${pretty(tx.hash)} ${event.description}`);
    return event;
  };
};
