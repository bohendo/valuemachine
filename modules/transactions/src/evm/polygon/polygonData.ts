import { getAddress, isAddress } from "@ethersproject/address";
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
  EvmNames,
  Logger,
  Store,
  StoreKeys,
  Transaction,
  TransactionsJson,
} from "@valuemachine/types";
import {
  chrono,
  getEmptyEvmData,
  getEvmTransactionError,
  getLogger,
} from "@valuemachine/utils";
import axios from "axios";

import { parsePolygonTx } from "./parser";

export const getPolygonData = (params?: {
  covalentKey: string;
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

  log.info(`Loaded polygon data containing ${
    json.transactions.length
  } transactions from ${polygonDataJson ? "input" : store ? "store" : "default"}`);

  const metadata = {
    id: 137,
    name: EvmNames.Polygon,
    feeAsset: Assets.MATIC,
  } as EvmMetadata;

  ////////////////////////////////////////
  // Internal Heleprs

  /*
  export const EvmTransactionLog = Type.Object({
    address: Address,
    data: HexString,
    index: Type.Number(),
    topics: Type.Array(Bytes32),
  });
  export const EvmTransaction = Type.Object({
    block: Type.Number(),
    data: HexString,
    from: Address,
    gasLimit: HexString,
    gasPrice: HexString,
    gasUsed: HexString,
    hash: Bytes32,
    index: Type.Number(),
    logs: Type.Array(EvmTransactionLog),
    nonce: Type.Number(),
    status: Type.Optional(Type.Number()),
    timestamp: TimestampString,
    to: Type.Union([Address, Type.Null()]),
    value: DecimalString,
  });
  */

  const formatCovalentTx = rawTx => ({
    block: rawTx.block_height,
    data: "0x", // not available?
    from: getAddress(rawTx.from_address),
    gasLimit: hexlify(rawTx.gas_offered),
    gasPrice: hexlify(rawTx.gas_price),
    gasUsed: hexlify(rawTx.gas_spent),
    hash: rawTx.tx_hash,
    index: rawTx.tx_offset,
    logs: rawTx.log_events.map(evt => ({
      address: getAddress(evt.sender_address),
      index: evt.log_offset,
      topics: evt.raw_log_topics,
      data: evt.raw_log_data || "0x",
    })),
    nonce: 0, // not available?
    status: rawTx.successful ? 1 : 0,
    timestamp: rawTx.block_signed_at,
    to: getAddress(rawTx.to_address),
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

  const syncAddress = async (address: Address): Promise<void> => {
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
      json.transactions.push(polygonTx);
      save();
    }
    return;
  };

  ////////////////////////////////////////
  // Exported Methods

  const getTransaction = (
    hash: Bytes32,
    addressBook: AddressBook,
  ): Transaction =>
    parsePolygonTx(
      json.transactions.find(tx => tx.hash === hash),
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
    const existing = json.transactions.find(existing => existing.hash === txHash);
    if (!getEvmTransactionError(existing)) {
      return;
    }
    log.info(`Fetching polygon data for tx ${txHash}`);
    const polygonTx = formatCovalentTx(await fetchTx(txHash));
    const error = getEvmTransactionError(polygonTx);
    if (error) throw new Error(error);
    // log.debug(polygonTx, `Parsed raw polygon tx to a valid evm tx`);
    json.transactions.push(polygonTx);
    save();
    return;
  };

  const syncAddressBook = async (addressBook: AddressBook): Promise<void> => {
    log.info(`addressBook has ${addressBook.json.length} entries`);
    for (const entry of addressBook.json) {
      const address = entry.address;
      if (addressBook.isSelf(address) && isAddress(address)) {
        await syncAddress(address);
      }
    }
    return;
  };

  const getTransactions = (
    addressBook: AddressBook,
  ): TransactionsJson => {
    const selfAddresses = addressBook.json
      .map(entry => entry.address)
      .filter(address => addressBook.isSelf(address))
      .filter(address => isAddress(address));
    const selfTransactionHashes = Array.from(new Set(
      selfAddresses.reduce((all, address) => {
        return all.concat(json.addresses[address]?.history || []);
      }, [])
    ));
    log.info(`Parsing ${selfTransactionHashes.length} polygon transactions`);
    return selfTransactionHashes.map(hash => parsePolygonTx(
      json.transactions.find(tx => tx.hash === hash),
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
