import { isAddress as isEvmAddress, getAddress as getEvmAddress } from "@ethersproject/address";
import { hexlify, isHexString } from "@ethersproject/bytes";
import { formatEther } from "@ethersproject/units";
import {
  AddressBook,
  Bytes32,
  EvmAddress,
  EvmData,
  EvmDataParams,
  EvmParsers,
  EvmTransaction,
  StoreKeys,
  Transaction,
  TransactionsJson,
} from "@valuemachine/types";
import {
  chrono,
  getBytes32Error,
  getEmptyEvmData,
  getEvmDataError,
  getEvmTransactionError,
  getLogger,
  toBN,
} from "@valuemachine/utils";
import axios from "axios";
import getQueue from "queue";

import { Assets, Guards } from "../../enums";

import { parseEthTx } from "./parser";

export const getEtherscanData = (params?: EvmDataParams): EvmData => {
  const { apiKey: etherscanKey, json: ethDataJson, logger, store } = params || {};
  const log = (logger || getLogger()).child?.({ module: "EthereumData" });
  const json = ethDataJson || store?.load(StoreKeys.EthereumData) || getEmptyEvmData();
  const save = () => store
    ? store.save(StoreKeys.EthereumData, json)
    : undefined;

  const inputError = getEvmDataError(json);
  if (inputError) throw new Error(inputError);

  log.info(`Loaded eth data containing ${
    Object.keys(json.transactions).length
  } EthTxs from ${ethDataJson ? "input" : store ? "store" : "default"}`);

  const metadata = {
    id: 1,
    name: Guards.Ethereum,
    feeAsset: Assets.ETH,
  };

  // Mapping of blockNumber (IntegerString): timestamp (TimestampString)
  // Bc Etherscan doesn't reliably return timestamps while fetching txns by hash
  const timestampCache = {} as { [blockNumber: string]: string };

  ////////////////////////////////////////
  // Internal Helper Functions

  const firstBlockTimeMs = 1438269988 * 1000; // timestamp of block #1 (genesis has no timestamp)

  const numify = (val: number | string): number => toBN(val).toNumber();
  const stringify = (val: number | string): string => numify(val).toString();
  const toISOString = (val?: number | string): string => new Date(
    !val ? Date.now()
    : typeof val === "number" ? val
    : val.includes("T") ? val
    : numify(val) < firstBlockTimeMs ? numify(val) * 1000
    : numify(val)
  ).toISOString();

  const getAddress = (address: string): string => `${metadata.name}/${getEvmAddress(address)}`;

  const query = async (
    target: EvmAddress | Bytes32,
    action: string = "txlistinternal",
    module: string = "account",
  ): Promise<any> => {
    if (!etherscanKey) throw new Error(`Etherscan key required`);
    const targetType = isEvmAddress(target) ? "address" : "txhash";
    const url = `https://api.etherscan.io/api?` +
      `module=${module}&` +
      `action=${action}&` +
      `${targetType}=${target}&` +
      `apikey=${etherscanKey}&sort=asc`;
    const cleanUrl = url.replace(/\??(api)?key=[^&]+&?/, "").replace(/&sort=asc$/, "");
    const wget = async () => {
      log.debug(`GET ${cleanUrl}`);
      return await axios.get(url, { timeout: 10000 }).catch(e => {
        // log.error(e.message);
        if (typeof e?.response === "string") log.error(e.response);
        throw new Error(e);
      });
    };
    let res;
    try {
      res = await wget();
      if (typeof res === "string") throw new Error(res);
      if (typeof res?.data?.result === "string") throw new Error(res?.data?.result);
    } catch (e) {
      const msg = e.message.toLowerCase();
      if (msg.includes("timeout") || msg.includes("eai_again") || msg.includes("econnreset")) {
        log.warn(`Request timed out, retrying to get ${action} for ${target}`);
        await new Promise(res => setTimeout(res, 1000)); // short pause
        res = await wget();
      } else if (msg.includes("rate limit") || msg.includes("429")) {
        log.warn(`We're rate limited, pausing then retrying to get ${action} for ${target}..`);
        await new Promise(res => setTimeout(res, 4000)); // long pause
        res = await wget();
      } else {
        log.error(`GET ${cleanUrl}`);
        throw e;
      }
    }
    const result = res?.data?.result;
    if (typeof result !== "object") {
      throw new Error(`Failed to get a valid result from ${cleanUrl}`);
    }
    return result;
  };

  const fetchHistory = async (address: EvmAddress): Promise<Bytes32[]> => {
    const [simple, internal, token, nft] = await Promise.all([
      query(address, "txlist", "account"),
      query(address, "txlistinternal", "account"),
      query(address, "tokentx", "account"),
      query(address, "tokennfttx", "account"),
    ]);
    // Etherscan doesn't provide timestamps while fetching tx info by hash
    // Save timestamps while fetching account histories so we can reuse them later
    [...simple, ...internal, ...token, ...nft].forEach(tx => {
      if (tx.blockNumber && (tx.timestamp || tx.timeStamp)) {
        const blockNumber = stringify(tx.blockNumber);
        const timestamp = toISOString(tx.timestamp || tx.timeStamp);
        timestampCache[blockNumber] = timestamp;
        log.debug(`Added new timestamp cache entry for ${blockNumber}: ${timestamp}`);
      }
    });
    return [
      ...simple.map(tx => tx.hash),
      ...internal.map(tx => tx.hash),
      ...token.map(tx => tx.hash),
      ...nft.map(tx => tx.hash),
    ].filter(hash => !!hash).sort();
  };

  const fetchTransaction = async (txHash: Bytes32): Promise<EvmTransaction> => {
    if (!etherscanKey) throw new Error(`Etherscan key required`);
    const [tx, receipt, transfers] = await Promise.all([
      query(txHash, "eth_getTransactionByHash", "proxy"),
      query(txHash, "eth_getTransactionReceipt", "proxy"),
      query(txHash, "txlistinternal", "account"),
    ]);
    // Etherscan does not return timestamps reliably.
    // If omitted then estimate based on: block time * block number
    let timestamp;
    const avgMsPerBlock = 14618; // (Date.now() - firstBlockTimeMs) / <latestBlockNumber>
    const rawTime = tx.timestamp || (tx as any).timeStamp
      || receipt.timestamp || (receipt as any).timeStamp
      || transfers[0]?.timestamp || (transfers[0] as any)?.timeStamp;
    if (!rawTime) {
      if (timestampCache[stringify(tx.blockNumber)]) {
        timestamp = timestampCache[stringify(tx.blockNumber)];
      } else {
        log.warn(`Etherscan didn't provide a timestamp for tx from block ${numify(receipt.blockNumber)}, using an estimate instead`);
        timestamp = toISOString(
          firstBlockTimeMs + (avgMsPerBlock * numify(receipt.blockNumber))
        );
      }
    } else {
      timestamp = toISOString(rawTime);
    }
    const transaction = {
      from: getAddress(tx.from),
      gasPrice: stringify(tx.effectiveGasPrice || tx.gasPrice),
      gasUsed: stringify(receipt.gasUsed),
      hash: hexlify(tx.hash),
      logs: receipt.logs.map(evt => ({
        address: getAddress(evt.address),
        index: numify(evt.logIndex),
        topics: evt.topics.map(hexlify),
        data: hexlify(evt.data || "0x"),
      })),
      nonce: numify(tx.nonce),
      status:
        // If post-byzantium, then the receipt already has a status, yay
        typeof receipt.status === "number" ? receipt.status
        : isHexString(receipt.status) ? numify(receipt.status)
        // If pre-byzantium tx used less gas than the limit, it definitely didn't fail
        : toBN(tx.gasLimit).gt(toBN(receipt.gasUsed)) ? 1
        // If it used exactly 21000 gas, it's PROBABLY a simple transfer that succeeded
        : toBN(tx.gasLimit).eq(toBN("21000")) ? 1
        // Otherwise it PROBABLY failed
        : 0,
      timestamp,
      transfers: transfers.map(transfer => ({
        to: transfer.to ? getAddress(transfer.to) : null,
        from: getAddress(transfer.from),
        value: formatEther(transfer.value),
      })),
      to: tx.to ? getAddress(tx.to) : null,
      value: formatEther(tx.value),
    };
    const txError = getEvmTransactionError(transaction);
    if (txError) {
      throw new Error(txError);
    }
    return transaction;
  };

  const syncAddress = async (rawAddress: EvmAddress): Promise<void> => {
    const address = getEvmAddress(
      rawAddress.includes("/") ? rawAddress.split("/").pop() : rawAddress
    );
    log.info(`Fetching transaction history of ${address}`);
    let history: string[];
    try {
      history = await fetchHistory(address);
    } catch (e) {
      log.error(e);
      return;
    }
    json.addresses[address] = {
      lastUpdated: toISOString(Date.now()),
      history,
    };
    save();
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
          tx = await fetchTransaction(txHash);
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
    try {
      const tx = await fetchTransaction(txHash);
      const txError = getEvmTransactionError(tx);
      if (txError) throw new Error(txError);
      json.transactions[txHash] = tx;
      save();
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
        !json.addresses[address] ||
        json.addresses[address].lastUpdated === zeroDate
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
      await syncAddress(address);
    }
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
    return selfTransactionHashes.map(hash => parseEthTx(
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
    parseEthTx(
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
