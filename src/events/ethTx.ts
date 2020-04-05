import { AddressZero } from "ethers/constants";
import { bigNumberify, hexlify, formatEther, keccak256, RLP } from "ethers/utils";

import { env } from "../env";
import { Event, TransactionData } from "../types";
import { Logger } from "../utils";
import { tokenEvents } from "../abi";
import { mergeFactory } from "./utils";


export const castEthTx = (addressBook): any =>
  (tx: TransactionData): Event => {
    const log = new Logger(
      `EthTx ${tx.hash.substring(0, 10)} ${tx.timestamp.split("T")[0]}`,
      env.logLevel,
    );
    const { getName, isCategory, pretty } = addressBook;

    if (!tx.logs) {
      throw new Error(`Missing logs for tx ${tx.hash}, did fetchChainData get interrupted?`);
    }

    if (tx.to === null) {
      // derived from: https://ethereum.stackexchange.com/a/46960
      tx.to = `0x${keccak256(RLP.encode([tx.from, hexlify(tx.nonce)])).substring(26)}`;
      log.debug(`new contract deployed to ${tx.to}`);
    }

    const event = {
      date: tx.timestamp,
      hash: tx.hash,
      prices: {},
      sources: ["ethTx"],
      tags: [],
      transfers: [{
        assetType: "ETH",
        fee: formatEther(bigNumberify(tx.gasUsed).mul(tx.gasPrice)),
        from: tx.from.toLowerCase(),
        index: 0,
        quantity: tx.value,
        to: tx.to.toLowerCase(),
      }],
    } as Event;

    if (tx.status !== 1) {
      log.debug(`setting reverted tx to have zero quantity`);
      event.transfers[0].quantity = "0";
      event.description = `${pretty(tx.from)} sent failed tx`;
      return event;
    }

    log.debug(`transfer of ${tx.value} ETH from ${tx.from} to ${tx.to}}`);

    for (const txLog of tx.logs) {
      if (isCategory("erc20")(txLog.address)) {

        const assetType = getName(txLog.address).toUpperCase();
        const eventI = tokenEvents.find(e => e.topic === txLog.topics[0]);

        if (!eventI) {
          log.debug(`Unable to identify ${assetType} event w topic: ${txLog.topics[0]}`);
          continue;
        }

        const data = eventI.decode(txLog.data, txLog.topics);
        const quantity = formatEther(data.value || data.wad || "0");
        const index = txLog.index;
        const transfer = { assetType, index, quantity };

        if (eventI.name === "Transfer") {
          event.transfers.push({ ...transfer, from: data.from, to: data.to });
          log.debug(`${quantity} ${assetType} was transfered to ${data.to}`);

        } else if (assetType === "WETH" && eventI.name === "Deposit") {
          event.transfers.push({ ...transfer, from: AddressZero, to: data.dst });
          log.debug(`Deposit by ${data.dst} minted ${quantity} ${assetType}`);

        } else if (assetType === "WETH" && eventI.name === "Withdrawal") {
          event.transfers.push({ ...transfer, from: data.src, to: AddressZero });
          log.debug(`Withdraw by ${data.dst} burnt ${quantity} ${assetType}`);

        } else if (assetType === "SAI" && eventI.name === "Mint") {
          event.transfers.push({ ...transfer, from: AddressZero, to: data.guy });
          log.debug(`Minted ${quantity} ${assetType}`);

        } else if (assetType === "SAI" && eventI.name === "Burn") {
          event.transfers.push({ ...transfer, from: data.guy, to: AddressZero });
          log.debug(`Burnt ${quantity} ${assetType}`);

        } else if (eventI.name === "Approval") {
          log.debug(`Skipping Approval event`);

        } else if (eventI) {
          log.warn(`Unknown ${assetType} event: ${JSON.stringify(eventI)}`);
        }
      }
    }

    event.transfers = event.transfers
      // Make sure all addresses are lower-case
      .map(transfer => ({ ...transfer, to: transfer.to.toLowerCase() }))
      .map(transfer => ({ ...transfer, from: transfer.from.toLowerCase() }))
      // sort by index
      .sort((t1, t2) => t1.index - t2.index);

    if (event.transfers.length === 0) {
      throw new Error(`No transfers for EthTx: ${JSON.stringify(event, null, 2)}`);
    } else if (event.transfers.length === 1) {
      const { assetType, from, quantity, to } = event.transfers[0];
      event.description = `${pretty(from)} sent ${quantity} ${assetType} to ${getName(to)}`;
    } else {
      event.description = `${pretty(event.transfers[0].to)} made ${event.transfers.length} transfers`;
    }

    log.info(event.description);

    return event;
  };

export const mergeEthTx = mergeFactory({
  allowableTimeDiff: 0,
  log: new Logger("MergeEthTx", env.logLevel),
  mergeEvents: (): void => {
    throw new Error(`idk how to merge txEvents`);
  },
  shouldMerge: (event: Event, txEvent: Event): boolean =>
    event.hash === txEvent.hash,
});
