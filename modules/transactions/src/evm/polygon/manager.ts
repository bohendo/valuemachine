import { isAddress as isEvmAddress, getAddress as getEvmAddress } from "@ethersproject/address";
import { formatEther } from "@ethersproject/units";
import { hexlify } from "@ethersproject/bytes";
import {
  AddressBook,
  Bytes32,
  EvmAddress,
  EvmData,
  EvmDataJson,
  EvmMetadata,
  EvmParsers,
  Logger,
  Store,
  StoreKeys,
  Transaction,
  TransactionsJson,
} from "@valuemachine/types";
import {
  chrono,
  getEmptyEvmData,
  getEvmDataError,
  getEvmTransactionError,
  getLogger,
  toBN,
} from "@valuemachine/utils";
import getQueue from "queue";

import { toISOString } from "../utils";
import { Assets, Guards } from "../../enums";

import { getCovalentFetcher } from "./covalent";
import { getPolygonscanFetcher } from "./polygonscan";
import { parsePolygonTx } from "./parser";

export const getPolygonData = ({
  covalentKey,
  polygonscanKey,
  json: polygonDataJson,
  logger,
  store,
}: {
  covalentKey?: string,
  polygonscanKey?: string,
  json?: EvmDataJson;
  logger?: Logger,
  store?: Store,
}): EvmData => {
  const log = (logger || getLogger()).child?.({ module: "PolygonData" });
  const json = polygonDataJson || store?.load(StoreKeys.PolygonData) || getEmptyEvmData();
  const save = () => store
    ? store.save(StoreKeys.PolygonData, json)
    : log.warn(`No store provided, can't save polygon data`);

  const error = getEvmDataError(json);
  if (error) throw new Error(error);

  log.info(`Loaded polygon data containing ${
    Object.keys(json.transactions).length
  } transactions from ${polygonDataJson ? "input" : store ? "store" : "default"}`);

  const metadata = {
    id: 137,
    name: Guards.Polygon,
    feeAsset: Assets.MATIC,
  } as EvmMetadata;

  const fetcher = polygonscanKey ? getPolygonscanFetcher({ apiKey: polygonscanKey, logger })
    : covalentKey ? getCovalentFetcher({ apiKey: covalentKey, logger })
    : null;

  ////////////////////////////////////////
  // Internal Heleprs

  const getAddress = (address: string): string => `${metadata.name}/${getEvmAddress(address)}`;

  const formatCovalentTx = rawTx => ({
    // block: rawTx.block_height,
    // data: "0x", // not available?
    // gasLimit: hexlify(rawTx.gas_offered),
    // index: rawTx.tx_offset,
    from: getAddress(rawTx.from_address),
    gasPrice: toBN(rawTx.gas_price).toString(),
    gasUsed: toBN(rawTx.gas_spent).toString(),
    hash: hexlify(rawTx.tx_hash),
    logs: rawTx.log_events.map(evt => ({
      address: getAddress(evt.sender_address),
      index: evt.log_offset,
      topics: evt.raw_log_topics.map(hexlify),
      data: hexlify(evt.raw_log_data || "0x"),
    })),
    nonce: 0, // TODO: We need this to calculate the addresses of newly created contracts
    status: rawTx.successful ? 1 : 0,
    timestamp: rawTx.block_signed_at,
    transfers: [], // not available, get from etherscan
    to: rawTx.to_address ? getAddress(rawTx.to_address) : null,
    value: formatEther(rawTx.value),
  });

  const syncAddress = async (rawAddress: EvmAddress): Promise<void> => {
    if (!fetcher) throw new Error(`Either a covalentKey or a polygonscanKey is required`);
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
    save();
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
        save();
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

  const logProg = (list: any[], elem: any): string =>
    `${list.indexOf(elem)+1}/${list.length}`;

  ////////////////////////////////////////
  // Exported Methods

  const syncTransaction = async (
    txHash: string,
  ): Promise<void> => {
    if (!txHash) {
      throw new Error(`Cannot sync an invalid tx hash: ${txHash}`);
    }
    const existing = json.transactions[txHash];
    if (!getEvmTransactionError(existing)) {
      return;
    }
    if (!fetcher) throw new Error(`Either a covalentKey or a polygonscanKey is required`);
    log.info(`Fetching polygon data for tx ${txHash}`);
    const polygonTx = formatCovalentTx(await fetcher.fetchTransaction(txHash));
    const error = getEvmTransactionError(polygonTx);
    if (error) throw new Error(error);
    // log.debug(polygonTx, `Parsed raw polygon tx to a valid evm tx`);
    json.transactions[polygonTx.hash] = polygonTx;
    save();
    return;
  };

  const syncAddressBook = async (addressBook: AddressBook): Promise<void> => {
    const zeroDate = new Date(0).toISOString();
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
        return true;
      }
      const hour = 60 * 60 * 1000;
      const month = 30 * 24 * hour;
      const lastUpdated = json.addresses[address]?.lastUpdated || zeroDate;
      log.info(`${address} last action was on ${lastAction}, last updated on ${lastUpdated}`);
      // Don't sync any addresses w no recent activity if they have been synced before
      if (lastUpdated && Date.now() - new Date(lastAction).getTime() > 12 * month) {
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
      // Find the most recent tx timestamp that involved any interaction w this address
      log.info(`Fetching history for address ${logProg(addresses, address)}: ${address}`);
      await syncAddress(address);
    }
    // Make sure all transactions for all addresses have been synced
    for (const address of selfAddresses) {
      log.debug(`Syncing transactions for address ${logProg(selfAddresses, address)}: ${address}`);
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
      .filter(address => isEvmAddress(address))
      .map(address => getEvmAddress(address));
    const selfTransactionHashes = Array.from(new Set(
      selfAddresses.reduce((all, address) => {
        return all.concat(json.addresses[address]?.history || []);
      }, [])
    ));
    log.info(`Parsing ${selfTransactionHashes.length} polygon transactions`);
    return selfTransactionHashes.map(hash => parsePolygonTx(
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
    parsePolygonTx(
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
