import { isAddress as isEthAddress, getAddress } from "@ethersproject/address";
import { BigNumber } from "@ethersproject/bignumber";
import { hexDataLength, hexlify, isHexString } from "@ethersproject/bytes";
import { EtherscanProvider, JsonRpcProvider, Provider } from "@ethersproject/providers";
import { formatEther } from "@ethersproject/units";
import {
  Address,
  AddressBook,
  Cryptocurrencies,
  Bytes32,
  EvmData,
  EvmDataJson,
  EvmDataParams,
  EvmTransfer,
  EvmParser,
  EvmNames,
  StoreKeys,
  Transaction,
  TransactionsJson,
} from "@valuemachine/types";
import {
  getEvmDataError,
  getEmptyEvmData,
  getEvmTransactionError,
  getLogger,
  toBN,
} from "@valuemachine/utils";
import axios from "axios";

import { parseEthTx } from "./parser";

export const getEthereumData = (params?: EvmDataParams): EvmData => {
  const { json: ethDataJson, etherscanKey, logger, store } = params || {};
  const log = (logger || getLogger()).child?.({ module: "EthereumData" });
  const json = ethDataJson || store?.load(StoreKeys.EthereumData) || getEmptyEvmData();

  const metadata = {
    id: 1,
    name: EvmNames.Ethereum,
    feeAsset: Cryptocurrencies.ETH,
  };

  const save = () => store
    ? store.save(StoreKeys.EthereumData, json)
    : log.warn(`No store provided, can't save eth data`);

  const error = getEvmDataError(json);
  if (error) throw new Error(error);

  if (!json.addresses) json.addresses = {};
  if (!json.calls) json.calls = [];
  if (!json.transactions) json.transactions = [];

  log.info(`Loaded eth data containing ${
    json.transactions.length
  } EthTxs from ${ethDataJson ? "input" : store ? "store" : "default"}`);

  ////////////////////////////////////////
  // Internal Helper Functions

  const toTimestamp = (tx: any): string => {
    const val = `${tx.timestamp || tx.timeStamp}`;
    try {
      if (val.match(/^[0-9]+$/)) {
        return new Date(parseInt(val) * 1000).toISOString();
      } else {
        return new Date(val).toISOString();
      }
    } catch (e) {
      log.error(`Failed to get timestamp from object: ${JSON.stringify(tx, null, 2)}: ${e.stack}`);
      throw e;
    }
  };

  const toNum = (num: BigNumber | number): number =>
    parseInt(toBN(num.toString()).toString(), 10);

  const toHex = (num: BigNumber | number): string => hexlify(toBN(num));

  const logProg = (list: any[], elem: any): string =>
    `${list.indexOf(elem)+1}/${list.length}`;

  const chrono = (d1: any, d2: any): number =>
    new Date(d1.timestamp || d1.date || d1).getTime()
    - new Date(d2.timestamp || d2.date || d2).getTime();

  const getProvider = (key?: string): Provider => {
    if (process.env.VM_ETH_PROVIDER) {
      log.debug(`Connecting eth provider to ${process.env.VM_ETH_PROVIDER}`);
      return new JsonRpcProvider(process.env.VM_ETH_PROVIDER);
    } else {
      log.debug(`Connecting eth provider to etherscan`);
      return new EtherscanProvider("homestead", key || etherscanKey);
    }
  };

  const fetchHistory = async (
    action: string,
    address: Address,
    key?: string,
  ): Promise<any[] | undefined> => {
    const target = action === "txlist" ? "transaction history"
      : action === "txlistinternal" ? "internal call history"
      : action === "tokentx" ? "token history"
      : "";
    const url = `https://api.etherscan.io/api?module=account&` +
      `action=${action}&` +
      `address=${address}&` +
      `apikey=${key || etherscanKey || ""}&sort=asc`;
    log.info(`Sent request for ${target} from Etherscan`);
    try {
      const result = (await axios.get(url, { timeout: 10000 })).data.result;
      if (typeof result === "string") {
        log.warn(`Failed to get ${target}: ${result}`);
        return undefined;
      }
      log.info(`Received ${result.length} ${target} results from Etherscan`);
      return result;
    } catch (e) {
      log.warn(e.message);
      return undefined;
    }
  };

  // Beware of edge case: a tx makes 2 identical eth internal transfers and
  // the to & from are both tracked accounts so we get these calls in the txHistory of both.
  // We do want to include these two identical transfers so we can't naively dedup
  // But we don't want a copy from both account's tx history so can't blindly push everything
  // Solution: save snapshot before you start editing, duplicates in snapshot mean throw it away
  const getDups = (oldList: any[], newElem: any): number =>
    oldList.filter(oldElem =>
      newElem.from === oldElem.from &&
      newElem.hash === oldElem.hash &&
      newElem.to === oldElem.to &&
      (
        newElem.value.includes(".") ? newElem.value : formatEther(newElem.value)
      ) === oldElem.value,
    ).length;

  const merge = (newJson: EvmDataJson): void => {
    if (!newJson.addresses || !newJson.transactions || !newJson.calls) {
      throw new Error(`Invalid EvmDataJson, got keys: ${Object.keys(newJson)}`);
    }
    let before;
    before = Object.keys(json.addresses).length; 
    for (const address of Object.keys(newJson.addresses)) {
      json.addresses[address] = newJson.addresses[address];
    }
    log.debug(`Merged ${Object.keys(json.addresses).length - before} new addresses`);
    before = json.transactions.length;
    for (const newTx of newJson.transactions) {
      if (!json.transactions.some(tx => tx.hash === newTx.hash)) {
        json.transactions.push(newTx);
      }
    }
    log.debug(`Merged ${json.transactions.length - before} new transactions`);
    const oldCalls = JSON.parse(JSON.stringify(json.calls));
    before = Object.keys(oldCalls).length; 
    for (const call of newJson.calls) {
      if (getDups(oldCalls, call) === 0) {
        json.calls.push(call);
      }
    }
    log.debug(`Merged ${json.calls.length - before} new calls`);
    return;
  };

  const getEvmTransfers = (testFn: (_call: EvmTransfer) => boolean): EvmTransfer[] =>
    JSON.parse(JSON.stringify(json.calls.filter(testFn)));

  ////////////////////////////////////////
  // Exported Methods

  const syncTransaction = async (
    txHash: string,
    key?: string,
  ): Promise<void> => {
    if (!txHash) { // TODO use getBytes32Error util
      throw new Error(`Cannot sync an invalid tx hash: ${txHash}`);
    }
    const existing = json.transactions.find(existing => existing.hash === txHash);
    if (!getEvmTransactionError(existing)) {
      return;
    }
    log.info(`Fetching eth data for tx ${txHash}`);
    const provider = getProvider(key);
    log.debug(`Sent request for tx ${txHash}`);
    const [response, receipt] = await Promise.all([
      await provider.getTransaction(txHash),
      await provider.getTransactionReceipt(txHash),
    ]);
    log.debug(`Received ${receipt.logs.length} logs for tx ${txHash}`);
    const block = toNum(receipt.blockNumber);
    let timestamp;
    if (response.timestamp) {
      timestamp = toTimestamp(response);
    } else {
      log.debug(`Sent request for block ${block}`);
      const blockData = await provider.getBlock(block);
      log.debug(`Received data for block ${block}`);
      timestamp = toTimestamp(blockData);
    }
    const newTx = {
      block,
      data: response.data || "0x",
      from: getAddress(response.from),
      gasLimit: toHex(response.gasLimit),
      gasPrice: toHex(response.gasPrice),
      gasUsed: toHex(receipt.gasUsed),
      hash: txHash,
      index: receipt.transactionIndex,
      logs: receipt.logs.map(log => ({
        address: getAddress(log.address),
        data: log.data,
        index: log.logIndex,
        topics: log.topics,
      })),
      nonce: toNum(response.nonce),
      status:
        // If post-byzantium, then the receipt already has a status, yay
        typeof receipt.status === "number" ? receipt.status
        // If pre-byzantium tx used less gas than the limit, it definitely didn't fail
        : toBN(response.gasLimit).gt(toBN(receipt.gasUsed)) ? 1
        // If it used exactly 21000 gas, it's PROBABLY a simple transfer that succeeded
        : toBN(response.gasLimit).eq(toBN("21000")) ? 1
        // Otherwise it PROBABLY failed
        : 0,
      timestamp,
      to: response.to ? getAddress(response.to) : null,
      value: formatEther(response.value),
    };
    const error = getEvmTransactionError(newTx);
    if (error) {
      throw new Error(error);
    }
    if (existing) {
      json.transactions.splice(
        json.transactions.findIndex(tx => tx.hash === existing.hash),
        1,
        newTx,
      );
    } else {
      json.transactions.push(newTx);
      json.transactions.sort((tx1, tx2) =>
        parseFloat(`${tx1.block}.${tx1.index}`) - parseFloat(`${tx2.block}.${tx2.index}`),
      );
    }
    save();
    return;
  };

  const syncAddress = async (_address: Address, key?: string): Promise<void> => {
    const address = getAddress(_address);
    if (!json.addresses[address]) {
      json.addresses[address] = { history: [], lastUpdated: new Date(0).toISOString() };
    }
    const lastUpdated = (new Date()).toISOString();
    const [txHistory, callHistory, tokenHistory] = await Promise.all([
      fetchHistory("txlist", address, key),
      fetchHistory("txlistinternal", address, key),
      fetchHistory("tokentx", address, key),
    ]);
    if (!txHistory || !callHistory || !tokenHistory) {
      throw new Error(`Unable to fetch history of ${address} from etherscan`);
    }
    const history = Array.from(new Set([
      ...json.addresses[address].history,
      ...txHistory,
      ...callHistory,
      ...tokenHistory
    ].map(tx => tx.hash || tx).filter(hash =>
      isHexString(hash) && hexDataLength(hash) === 32
    ))).sort();
    json.addresses[address].history = history;
    const oldEvmTransfers = JSON.parse(JSON.stringify(json.calls));
    for (const call of callHistory) {
      if (getDups(oldEvmTransfers, call) > 0) {
        log.debug(`Skipping eth call, dup detected`);
        continue;
      }
      json.calls.push({
        block: toNum(call.blockNumber),
        from: getAddress(call.from),
        hash: call.hash,
        timestamp: toTimestamp(call),
        // Contracts creating contracts: if call.to is empty then this is a contract creation call
        // our target address must be either the call.to or call.from
        to: ((call.to === "" || call.to === null) && call.from !== address)
          ? address
          : call.to ? getAddress(call.to) : null,
        value: formatEther(call.value),
      });
    }
    json.addresses[address].lastUpdated = lastUpdated;
    save();
    log.info(`Saved calls & history for address ${address} + lastUpdated`);
    for (const hash of history) {
      await syncTransaction(hash, key);
    }
    return;
  };

  const syncAddressBook = async (addressBook: AddressBook, key?: string): Promise<void> => {
    const zeroDate = new Date(0).toISOString();
    const selfAddresses = addressBook.json
      .map(entry => entry.address)
      .filter(address => addressBook.isSelf(address))
      .filter(address => isEthAddress(address))
      .map(address => getAddress(address));
    const addresses = selfAddresses.filter(address => {
      if (
        !json.addresses[address] ||
        json.addresses[address].lastUpdated === zeroDate
      ) {
        return true;
      }
      const lastAction = json.transactions
        .filter(tx => json.addresses[address].history.some(hash => hash === tx.hash))
        .map(tx => tx.timestamp)
        .concat(
          json.calls
            .filter(call => call.to === address || call.from === address)
            .map(tx => tx.timestamp),
        )
        .sort(chrono).reverse()[0];
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
      if (Date.now() - new Date(lastUpdated).getTime() < 6 * hour) {
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
      await syncAddress(address, key);
    }
    log.info(`Fetching tx data for ${selfAddresses.length} addresses`);
    for (const address of selfAddresses) {
      log.debug(`Syncing transactions for address ${logProg(selfAddresses, address)}: ${address}`);
      for (const hash of json.addresses[address] ? json.addresses[address].history : []) {
        await syncTransaction(hash, key);
      }
    }
  };

  const getTransactions = (
    addressBook: AddressBook,
    extraParsers?: EvmParser[],
  ): TransactionsJson => {
    const selfAddresses = addressBook.json
      .map(entry => entry.address)
      .filter(address => addressBook.isSelf(address))
      .filter(address => isEthAddress(address))
      .map(address => getAddress(address));
    const selfTransactionHashes = Array.from(new Set(
      selfAddresses.reduce((all, address) => {
        log.info(`Adding ${json.addresses[address]?.history?.length || 0} entries for ${address} (${all.length} so far)`);
        return all.concat(json.addresses[address]?.history || []);
      }, [])
    ));
    log.info(`Parsing ${selfTransactionHashes.length} eth transactions`);
    return selfTransactionHashes.map(hash => parseEthTx(
      json.transactions.find(tx => tx.hash === hash),
      getEvmTransfers((call: EvmTransfer) => call.hash === hash),
      metadata,
      addressBook,
      logger,
      extraParsers,
    )).sort(chrono);
  };

  const getTransaction = (
    hash: Bytes32,
    addressBook: AddressBook,
    extraParsers?: EvmParser[],
  ): Transaction =>
    parseEthTx(
      json.transactions.find(tx => tx.hash === hash),
      getEvmTransfers((call: EvmTransfer) => call.hash === hash),
      metadata,
      addressBook,
      logger,
      extraParsers,
    );

  ////////////////////////////////////////
  // One more bit of init code before returning

  if (ethDataJson && store) {
    merge(store.load(StoreKeys.EthereumData));
  }

  return {
    getTransaction,
    getTransactions,
    json,
    syncAddressBook,
    syncTransaction,
  };
};
