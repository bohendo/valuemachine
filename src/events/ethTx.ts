import { AddressZero } from "ethers/constants";
import { Interface, formatEther, keccak256, EventDescription, RLP } from "ethers/utils";
import { abi as tokenAbi } from "@openzeppelin/contracts/build/contracts/ERC20.json";

import { env } from "../env";
import { Event, TransactionData } from "../types";
import { Logger } from "../utils";
import { getDescription } from "./utils";
import { saiAbi, wethAbi } from "../abi";

const getEvents = (abi: any): EventDescription[] => Object.values((new Interface(abi)).events);
const tokenEvents =
  Object.values(getEvents(tokenAbi).concat(getEvents(wethAbi)).concat(getEvents(saiAbi)));

export const castEthTx = (addressBook): any =>
  (tx: TransactionData): Event | null => {
    const log = new Logger(`EthTx ${tx.hash.substring(0, 10)}`, env.logLevel);
    const { getName, isCategory } = addressBook;

    if (!tx.logs) {
      throw new Error(`Missing logs for tx ${tx.hash}, did fetchChainData get interrupted?`);
    }

    if (tx.to === null) {
      // derived from: https://ethereum.stackexchange.com/a/46960
      tx.to = keccak256(RLP.encode([tx.from, tx.nonce])).substring(0, 24);
      log.debug(`new contract deployed to ${tx.to}`);
    }

    const event = {
      date: tx.timestamp,
      hash: tx.hash,
      prices: {},
      sources: new Set(["ethTx"]),
      tags: new Set(),
      transfers: [{
        assetType: "ETH",
        from: tx.from,
        quantity: tx.value,
        to: tx.to,
      }],
    } as Event;

    log.debug(`transfer of ${tx.value} ETH from ${tx.from} to ${tx.to}}`);

    for (const txLog of tx.logs) {
      if (isCategory(txLog.address, "erc20")) {

        const assetType = getName(txLog.address).toUpperCase();

        const eventI = tokenEvents.find(e => e.topic === txLog.topics[0]);
        if (!eventI) {
          log.debug(`Unable to identify ${assetType} event w topic: ${txLog.topics[0]}`);
          continue;
        }

        const data = eventI.decode(txLog.data, txLog.topics);
        if (!data) {
          log.debug(`Unable to decode ${assetType} ${eventI.name} event data`);
          continue;
        }

        if (eventI.name === "Transfer") {
          event.transfers.push({
            assetType,
            from: data.from,
            quantity: formatEther(data.value),
            to: data.to,
          });
          log.debug(`${formatEther(data.value)} ${assetType} was transfered to ${data.to}`);

        } else if (assetType === "WETH" && eventI.name === "Deposit") {
          event.transfers.push({
            assetType,
            from: txLog.address,
            quantity: formatEther(data.value),
            to: data.dst,
          });
          log.debug(`Deposit by ${data.dst} minted ${formatEther(data.value)} ${assetType}`);

        } else if (assetType === "WETH" && eventI.name === "Withdrawal") {
          event.transfers.push({
            assetType,
            from: data.src,
            quantity: formatEther(data.value),
            to: txLog.address,
          });
          log.debug(`Withdraw by ${data.dst} burnt ${formatEther(data.value)} ${assetType}`);

        } else if (assetType === "SAI" && eventI.name === "Mint") {
          event.transfers.push({
            assetType,
            from: AddressZero,
            quantity: formatEther(data.wad),
            to: data.guy,
          });
          log.debug(`Minted ${formatEther(data.wad)} ${assetType}`);

        } else if (assetType === "SAI" && eventI.name === "Burn") {
          event.transfers.push({
            assetType,
            from: data.guy,
            quantity: formatEther(data.wad),
            to: AddressZero,
          });
          log.debug(`Burnt ${formatEther(data.wad)} ${assetType}`);

        } else if (eventI.name === "Approval") {
          log.debug(`Skipping Approval event`);

        } else if (eventI) {
          log.debug(`Unknown ${assetType} event: ${JSON.stringify(eventI)}`);
        }
      }
    }

    event.sources.add("ethLogs");

    event.description = getDescription(event);

    event.description !== "null"
      ? log.info(event.description)
      : log.debug(event.description);

    return event;
  };
