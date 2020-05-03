import {
  AddressBook,
  ChainData,
  Event,
  EventSources,
  ILogger,
  TransactionData,
  Transfer,
  TransferCategories,
} from "@finances/types";
import { ContextLogger } from "@finances/utils";

import { AddressZero } from "ethers/constants";
import { bigNumberify, hexlify, formatEther, formatUnits, keccak256, RLP } from "ethers/utils";

import { tokenEvents } from "../abi";

import { categorizeTransfer } from "./categorizeTransfer";
import { assertChrono, mergeFactory } from "./utils";

export const mergeEthTxEvents = (
  oldEvents: Event[],
  addressBook: AddressBook,
  chainData: ChainData,
  lastUpdated: number,
  logger?: ILogger,
): Event[] => {
  let events = JSON.parse(JSON.stringify(oldEvents));
  const log = new ContextLogger("EthTx", logger);

  const latestCachedEvent = events.length !== 0
    ? new Date(events[events.length - 1].date).getTime()
    : 0;

  // returns true if new
  const onlyNew = (data: any): boolean =>
    new Date(data.timestamp || data.date).getTime() - latestCachedEvent > 0;

  const newEthTxs = chainData.transactions.filter(onlyNew);
  log.info(`Processing ${newEthTxs.length} new ethereum transactions..`);
  newEthTxs
    .sort((tx1, tx2) => parseFloat(`${tx1.block}.${tx1.index}`) - parseFloat(`${tx2.block}.${tx2.index}`))
    .map((tx: TransactionData): Event => {
      if (new Date(tx.timestamp).getTime() <= lastUpdated) {
        return null;
      }
      const { getName, isToken } = addressBook;
      const log = new ContextLogger(`EthTx ${tx.hash.substring(0, 8)}`, logger);

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
        sources: [EventSources.EthTx],
        tags: [],
        transfers: [{
          assetType: "ETH",
          category: TransferCategories.Transfer,
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
        event.description = `${getName(tx.from)} sent failed tx`;
        return event;
      }

      event.transfers[0] = categorizeTransfer(event.transfers[0], [], addressBook, logger);

      log.debug(`${tx.value} ETH from ${tx.from} to ${tx.to}: ${event.transfers[0].category}`);

      for (const txLog of tx.logs) {
        if (isToken(txLog.address)) {

          const assetType = getName(txLog.address).toUpperCase();
          const eventI = tokenEvents.find(e => e.topic === txLog.topics[0]);

          if (!eventI) {
            log.debug(`Unable to identify ${assetType} event w topic: ${txLog.topics[0]}`);
            continue;
          }

          const data = eventI.decode(txLog.data, txLog.topics);
          const quantity = formatUnits(
            data.value || data.wad || "0",
            chainData.tokens[txLog.address] ? chainData.tokens[txLog.address].decimals : 18,
          );

          const index = txLog.index;
          const transfer = { assetType, category: "Transfer", index, quantity } as Transfer;

          if (eventI.name === "Transfer") {
            log.debug(`${quantity} ${assetType} was transfered to ${data.to}`);
            transfer.from = data.from || data.src;
            transfer.to = data.to || data.dst;
            transfer.category = TransferCategories.Transfer;
            event.transfers.push(categorizeTransfer(transfer, tx.logs, addressBook, logger));

          } else if (assetType === "WETH" && eventI.name === "Deposit") {
            log.debug(`Deposit by ${data.dst} minted ${quantity} ${assetType}`);
            transfer.category = TransferCategories.SwapOut;
            event.transfers.push({ ...transfer, from: txLog.address, to: data.dst });

          } else if (assetType === "WETH" && eventI.name === "Withdrawal") {
            log.debug(`Withdraw by ${data.dst} burnt ${quantity} ${assetType}`);
            transfer.category = TransferCategories.SwapIn;
            event.transfers.push({ ...transfer, from: data.src, to: txLog.address });

          } else if (assetType === "SAI" && eventI.name === "Mint") {
            log.debug(`Minted ${quantity} ${assetType}`);
            transfer.category = TransferCategories.Borrow;
            event.transfers.push({ ...transfer, from: AddressZero, to: data.guy });

          } else if (assetType === "SAI" && eventI.name === "Burn") {
            log.debug(`Burnt ${quantity} ${assetType}`);
            transfer.category = TransferCategories.Repay;
            event.transfers.push({ ...transfer, from: data.guy, to: AddressZero });

          } else if (eventI.name === "Approval") {
            log.debug(`Skipping Approval event`);

          } else if (eventI) {
            log.warn(`Unknown ${assetType} event: ${JSON.stringify(eventI)}`);
          }
        }
      }

      if (event.transfers.length === 0) {
        throw new Error(`No transfers for EthTx: ${JSON.stringify(event, null, 2)}`);
      } else if (event.transfers.length === 1) {
        const { assetType, from, quantity, to } = event.transfers[0];
        event.description = `${getName(from)} sent ${quantity} ${assetType} to ${getName(to)}`;
      } else {
        event.description = `${getName(event.transfers[0].to)} made ${event.transfers.length} transfers`;
      }

      log.info(event.description);

      event.transfers = event.transfers
        // Make sure all addresses are lower-case
        .map(transfer => ({ ...transfer, to: transfer.to.toLowerCase() }))
        .map(transfer => ({ ...transfer, from: transfer.from.toLowerCase() }))
        // sort by index
        .sort((t1, t2) => t1.index - t2.index);

      return event;
    }).filter(e => !!e).forEach((txEvent: Event): void => {
      events = mergeFactory({
        allowableTimeDiff: 0,
        log: new ContextLogger("MergeEthTx", logger),
        mergeEvents: (): void => {
          throw new Error(`idk how to merge txEvents`);
        },
        shouldMerge: (event: Event, txEvent: Event): boolean =>
          event.hash === txEvent.hash,
      })(events, txEvent);
    });
  assertChrono(events);

  return events;
};
