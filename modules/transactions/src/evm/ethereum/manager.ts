import { isAddress as isEvmAddress, getAddress as getEvmAddress } from "@ethersproject/address";
import { Bytes32, Logger } from "@valuemachine/types";
import { chrono, getBytes32Error, getLogger } from "@valuemachine/utils";
import getQueue from "queue";

import { Assets, Guards } from "../../enums";
import { AddressBook, Transaction, TransactionsJson } from "../../types";
import { EvmAddress, EvmData, EvmDataJson, EvmParsers } from "../types";
import { getEmptyEvmData, getEvmDataError, getEvmTransactionError, toISOString } from "../utils";

import { getAlchemyFetcher } from "./alchemy";
import { getEtherscanFetcher } from "./etherscan";
import { parseEthereumTx } from "./parser";

export const getEthereumData = ({
  alchemyProvider,
  etherscanKey,
  json: ethDataJson,
  logger,
  save,
}: {
  alchemyProvider?: string,
  etherscanKey?: string,
  json?: EvmDataJson,
  logger?: Logger,
  save?: (val: EvmDataJson) => void,
}): EvmData => {
  const log = (logger || getLogger()).child?.({ name: "EthereumData" });
  const json = ethDataJson || getEmptyEvmData();

  const inputError = getEvmDataError(json);
  if (inputError) throw new Error(inputError);

  log.debug(`Loaded eth data containing ${
    Object.keys(json.transactions).length
  } EthTxs from ${ethDataJson ? "input" : "default"}`);

  const metadata = {
    id: 1,
    name: Guards.Ethereum,
    feeAsset: Assets.ETH,
  };

  const fetcher = etherscanKey ? getEtherscanFetcher({ apiKey: etherscanKey, logger })
    : alchemyProvider ? getAlchemyFetcher({ providerUrl: alchemyProvider, logger })
    : null;

  // Mapping of blockNumber (IntString): timestamp (DateTimeString)
  // Bc Alchemy doesn't reliably return timestamps while fetching txns by hash
  // const timestampCache = {} as { [blockNumber: string]: string };

  ////////////////////////////////////////
  // Internal Helper Functions

  const syncAddress = async (rawAddress: EvmAddress): Promise<void> => {
    if (!fetcher) throw new Error(`Either an alchemyProvider or an etherscanKey is required`);
    const address = getEvmAddress(
      rawAddress.includes("/") ? rawAddress.split("/").pop() : rawAddress
    );
    log.info(`Fetching transaction history of ${address}`);
    let history: string[];
    try {
      history = await fetcher.fetchHistory(address);
    } catch (e) {
      log.error(e);
      return;
    }
    json.addresses[address] = {
      lastUpdated: toISOString(Date.now()),
      history,
    };
    save(json);
    if (!history.length) {
      log.info(`Didn't find any ${metadata.name} activity for ${address}`);
      return;
    }
    log.info(`Saved ${history.length} historical transactions for ${address}`);
    const q = getQueue({ autostart: true, concurrency: 1 });
    history.forEach(txHash => {
      q.push(async () => {
        if (!getEvmTransactionError(json.transactions[txHash])) {
          return;
        }
        log.info(`Syncing transaction data for ${txHash}`);
        let tx;
        try {
          tx = await fetcher.fetchTransaction(txHash);
        } catch (e) {
          log.error(e);
          return;
        }
        json.transactions[tx.hash] = tx;
        save(json);
      });
    });
    await new Promise<void>((res, rej) => {
      q.on("end", error => {
        if (error) {
          log.error(error);
          rej(error);
        } else {
          log.info(`Successfully synced data for address ${address}`);
          res();
        }
      });
    });
    return;
  };

  ////////////////////////////////////////
  // Exported Methods

  const syncTransaction = async (
    txHash: string,
  ): Promise<void> => {
    const txHashError = getBytes32Error(txHash);
    if (txHashError) throw new Error(txHashError);
    if (!getEvmTransactionError(json.transactions[txHash])) {
      return;
    }
    if (!fetcher) throw new Error(`Either an alchemyProvider or an etherscanKey is required`);
    try {
      const tx = await fetcher.fetchTransaction(txHash);
      const txError = getEvmTransactionError(tx);
      if (txError) throw new Error(txError);
      json.transactions[txHash] = tx;
      save(json);
    } catch (e) {
      log.error(e);
    }
  };

  const syncAddressBook = async (addressBook: AddressBook): Promise<void> => {
    const zeroDate = toISOString(0);
    const selfAddresses = Object.values(addressBook.json)
      .map(entry => entry.address)
      .filter(address => addressBook.isSelf(address))
      .map(address =>
        address.startsWith(`${metadata.name}/`) ? address.split("/").pop() // address on this evm
        : address.includes("/") ? "" // address on a different evm
        : address // generic address applies to all evms
      )
      .filter(address => isEvmAddress(address))
      .map(address => getEvmAddress(address));
    const addresses = selfAddresses.filter(address => {
      if (
        !json.addresses[address] || json.addresses[address].lastUpdated === zeroDate
      ) {
        return true;
      }
      const lastAction = json.addresses[address]?.history
        .map(txHash => json.transactions[txHash]?.timestamp || new Date(0))
        .sort((ts1, ts2) => new Date(ts1).getTime() - new Date(ts2).getTime())
        .reverse()[0];
      if (!lastAction) {
        log.info(`No activity detected for address ${address}`);
        return !json.addresses[address]?.lastUpdated;
      }
      const lastUpdated = json.addresses[address]?.lastUpdated || zeroDate;
      log.info(`${address} last action was on ${lastAction}, last updated on ${lastUpdated}`);
      const hour = 60 * 60 * 1000;
      const month = 30 * 24 * hour;
      // Don't sync any addresses w no recent activity if they have been synced before
      if (lastUpdated && Date.now() - new Date(lastAction).getTime() > 3 * month) {
        log.debug(`Skipping retired (${lastAction}) address ${address}`);
        return false;
      }
      // Don't sync any active addresses if they've been synced recently
      if (Date.now() - new Date(lastUpdated).getTime() < 18 * hour) {
        log.debug(`Skipping active (${lastAction}) address ${address}`);
        return false;
      }
      return true;
    });
    // Fetch tx history for addresses that need to be updated
    log.info(`Fetching tx history for ${addresses.length} out-of-date addresses`);
    for (const address of addresses) {
      await syncAddress(address);
    }
    // Make sure all transactions for all addresses have been synced
    for (const address of selfAddresses) {
      for (const hash of json.addresses[address] ? json.addresses[address].history : []) {
        await syncTransaction(hash);
      }
    }
  };

  const getTransactions = (
    addressBook: AddressBook,
    extraParsers?: EvmParsers,
  ): TransactionsJson => {
    const selfAddresses = Object.values(addressBook.json)
      .map(entry => entry.address)
      .filter(address => addressBook.isSelf(address))
      .map(address =>
        address.startsWith(`${metadata.name}/`) ? address.split("/").pop() // CAIP-10 on this evm
        : address.includes("/") ? "" // CAIP-10 address on different evm
        : address // non-CAIP-10 address
      )
      .filter(address => isEvmAddress(address))
      .map(address => getEvmAddress(address));
    const selfTransactionHashes = Array.from(new Set(
      selfAddresses.reduce((all, address) => {
        log.info(`Parsing ${
          json.addresses[address]?.history?.length || 0
        } transactions from ${address} (${all.length} so far)`);
        return all.concat(json.addresses[address]?.history || []);
      }, [])
    ));
    log.info(`Parsing a total of ${selfTransactionHashes.length} eth transactions`);
    return selfTransactionHashes.map(hash => parseEthereumTx(
      json.transactions[hash],
      metadata,
      addressBook,
      logger,
      extraParsers,
    )).filter(tx => tx.transfers?.length).sort(chrono);
  };

  const getTransaction = (
    hash: Bytes32,
    addressBook: AddressBook,
    extraParsers?: EvmParsers,
  ): Transaction =>
    parseEthereumTx(
      json.transactions[hash],
      metadata,
      addressBook,
      logger,
      extraParsers,
    );

  return {
    getTransaction,
    getTransactions,
    json,
    syncAddressBook,
    syncTransaction,
  };
};

