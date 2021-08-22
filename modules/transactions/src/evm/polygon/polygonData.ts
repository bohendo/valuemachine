import { isAddress as isEvmAddress, getAddress as getEvmAddress } from "@ethersproject/address";
import { formatEther } from "@ethersproject/units";
import { hexlify } from "@ethersproject/bytes";
import {
  Address,
  AddressBook,
  Assets,
  Bytes32,
  EvmData,
  EvmDataJson,
  EvmMetadata,
  Guards,
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
} from "@valuemachine/utils";
import axios from "axios";

import { parsePolygonTx } from "./parser";

export const getPolygonData = (params?: {
  covalentKey: string;
  etherscanKey: string;
  json?: EvmDataJson;
  logger?: Logger,
  store?: Store,
}): EvmData => {
  const { covalentKey, json: polygonDataJson, logger, store } = params || {};
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

  ////////////////////////////////////////
  // Internal Heleprs

  // CAIP-10
  const getAddress = (address: string): string => `${metadata.name}/${getEvmAddress(address)}`;

  const formatCovalentTx = rawTx => ({
    // block: rawTx.block_height,
    // data: "0x", // not available?
    // gasLimit: hexlify(rawTx.gas_offered),
    // index: rawTx.tx_offset,
    from: getAddress(rawTx.from_address),
    gasPrice: hexlify(rawTx.gas_price),
    gasUsed: hexlify(rawTx.gas_spent),
    hash: rawTx.tx_hash,
    logs: rawTx.log_events.map(evt => ({
      address: getAddress(evt.sender_address),
      index: evt.log_offset,
      topics: evt.raw_log_topics,
      data: evt.raw_log_data || "0x",
    })),
    nonce: 0, // TODO: We need this to calculate the addresses of newly created contracts
    status: rawTx.successful ? 1 : 0,
    timestamp: rawTx.block_signed_at,
    transfers: [], // not available, get from etherscan
    to: rawTx.to_address ? getAddress(rawTx.to_address) : null,
    value: formatEther(rawTx.value),
  });

  const covalentUrl = "https://api.covalenthq.com/v1";
  const queryCovalent = async (path: string, query?: any): Promise<any> => {
    if (!covalentKey) throw new Error(`A covalent api key is required to sync polygon data`);
    const url = `${covalentUrl}/${path}/?${
      Object.entries(query || {}).reduce((querystring, entry) => {
        querystring += `${entry[0]}=${entry[1]}&`;
        return querystring;
      }, "")
    }key=${covalentKey}`;
    log.info(`GET ${url}`);
    let res;
    try {
      res = await axios(url);
    } catch (e) {
      log.warn(`Axios error: ${e.message}`);
      return;
    }
    if (res.status !== 200) {
      log.warn(`Unsuccessful status: ${res.status}`);
      return;
    }
    if (res.data.error) {
      log.warn(`Covalent error: ${res.data.error_message}`);
      return;
    }
    return res.data.data;
  };

  const fetchTx = async (txHash: Bytes32): Promise<any> => {
    const data = await queryCovalent(`${metadata.id}/transaction_v2/${txHash}`);
    return data?.items?.[0];
  };

  const syncAddress = async (rawAddress: Address): Promise<void> => {
    const address = getEvmAddress(
      rawAddress.includes("/") ? rawAddress.split("/").pop() : rawAddress
    );
    const yesterday = Date.now() - 1000 * 60 * 60 * 24;
    if (new Date(json.addresses[address]?.lastUpdated || 0).getTime() > yesterday) {
      log.info(`Info for address ${address} is up to date`);
      return;
    }
    let data = await queryCovalent(`${metadata.id}/address/${address}/transactions_v2`);
    const items = data?.items;
    while (items && data.pagination.has_more) {
      data = await queryCovalent(`${metadata.id}/address/${address}/transactions_v2`, {
        ["page-number"]: data.pagination.page_number + 1,
      });
      items.push(...data.items);
    }
    const history = items?.map(item => item.tx_hash).sort() || [];
    json.addresses[address] = {
      lastUpdated: new Date().toISOString(),
      history,
    };
    save();
    for (const txHash of history) {
      const polygonTx = formatCovalentTx(
        items.find(item => item.tx_hash === txHash)
        || await fetchTx(txHash)
      );
      const error = getEvmTransactionError(polygonTx);
      if (error) throw new Error(error);
      json.transactions[polygonTx.hash] = polygonTx;
      save();
    }
    return;
  };

  const logProg = (list: any[], elem: any): string =>
    `${list.indexOf(elem)+1}/${list.length}`;

  ////////////////////////////////////////
  // Exported Methods

  const getTransaction = (
    hash: Bytes32,
    addressBook: AddressBook,
  ): Transaction =>
    parsePolygonTx(
      json.transactions[hash],
      metadata,
      addressBook,
      logger,
    );

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
    log.info(`Fetching polygon data for tx ${txHash}`);
    const polygonTx = formatCovalentTx(await fetchTx(txHash));
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
    log.info(`Fetching tx data for ${selfAddresses.length} addresses`);
    for (const address of selfAddresses) {
      log.debug(`Syncing transactions for address ${logProg(selfAddresses, address)}: ${address}`);
      for (const hash of json.addresses[address] ? json.addresses[address].history : []) {
        await syncTransaction(hash);
      }
    }
  };

  const getTransactions = (
    addressBook: AddressBook,
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
    )).sort(chrono);
  };

  return {
    getTransaction,
    getTransactions,
    json,
    syncAddressBook,
    syncTransaction,
  };
};
