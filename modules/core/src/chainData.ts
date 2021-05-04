import {
  Address,
  emptyChainData,
  EthTransaction,
  EthCall,
  ChainData,
  ChainDataJson,
  HexString,
  Logger,
  Store,
  StoreKeys,
  TokenData,
} from "@finances/types";
import { getLogger, sm, smeq } from "@finances/utils";
import { BigNumber, Contract, constants, providers, utils  } from "ethers";
import axios from "axios";

import { getTokenInterface } from "./abi";
import { getEthTransactionError } from "./verify";

type Provider = providers.Provider;
const { JsonRpcProvider } = providers;
const { formatEther, getAddress, hexlify, toUtf8String } = utils;

export const getChainData = ({
  chainDataJson,
  etherscanKey,
  logger,
  store,
}: {
  chainDataJson?: ChainDataJson;
  etherscanKey?: string;
  logger?: Logger;
  store?: Store;
}): ChainData => {
  const log = (logger || getLogger()).child?.({ module: "ChainData" });
  const json = chainDataJson || (store ? store.load(StoreKeys.ChainData) : emptyChainData);

  log.info(`Loaded chain data containing ${
    json.transactions.length
  } EthTxs from ${chainDataJson ? "input" : store ? "store" : "default"}`);

  ////////////////////////////////////////
  // Internal Helper Functions

  const toBN = (n: BigNumber | number | string | { _hex: HexString }): BigNumber =>
    BigNumber.from(
      (n && (n as { _hex: HexString })._hex)
        ? (n as { _hex: HexString })._hex
        : n.toString(),
    );

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

  const toStr = (str: HexString | string): string =>
    str.startsWith("0x") ? toUtf8String(str).replace(/\u0000/g, "") : str;

  const logProg = (list: any[], elem: any): string =>
    `${list.indexOf(elem)+1}/${list.length}`;

  const chrono = (d1: any, d2: any): number =>
    new Date(d1.timestamp || d1).getTime() - new Date(d2.timestamp || d2).getTime();

  const getProvider = (key?: string): Provider => {
    if (process.env.FINANCES_ETH_PROVIDER) {
      log.debug(`Connecting eth provider to ${process.env.FINANCES_ETH_PROVIDER}`);
      return new JsonRpcProvider(process.env.FINANCES_ETH_PROVIDER);
    } else {
      log.debug(`Connecting eth provider to etherscan`);
      return new providers.EtherscanProvider("homestead", key || etherscanKey);
    }
  };

  const assertStore = (): void => {
    if (!store) {
      throw new Error("To sync chain data, you must provide an etherscanKey");
    }
  };

  const fetchHistory = async (action: string, address: Address): Promise<any[]> => {
    const url = `https://api.etherscan.io/api?module=account&` +
      `action=${action}&` +
      `address=${address}&` +
      `apikey=${etherscanKey}&sort=asc`;
    log.debug(`⏪ sent request for ${url}`);
    const result = (await axios.get(url, { timeout: 10000 })).data.result;
    log.debug(`➡️  received ${result.length} results from ${url}`);
    return result;
  };

  // Beware of edge case: a tx makes 2 identical eth internal transfers and
  // the to & from are both tracked accounts so we get these calls in the txHistory of both.
  // We do want to include these two identical transfers so we can't naively dedup
  // But we don't want a copy from both account's tx history so can't blindly push everything
  // Solution: save snapshot before you start editing, duplicates in snapshot mean throw it away
  const getDups = (oldList: any[], newElem: any): number =>
    oldList.filter(oldElem =>
      smeq(newElem.from, oldElem.from) &&
      newElem.hash === oldElem.hash &&
      smeq(newElem.to, oldElem.to) &&
      (
        newElem.value.includes(".") ? newElem.value : formatEther(newElem.value)
      ) === oldElem.value,
    ).length;

  ////////////////////////////////////////
  // Exported Methods

  const merge = (newJson: ChainDataJson): void => {
    if (!newJson.addresses || !newJson.tokens || !newJson.transactions || !newJson.calls) {
      throw new Error(`Invalid ChainDataJson, got keys: ${Object.keys(newJson)}`);
    }
    let before;
    before = Object.keys(json.addresses).length; 
    for (const address of Object.keys(newJson.addresses)) {
      json.addresses[address] = newJson.addresses[address];
    }
    log.info(`Merged ${Object.keys(json.addresses).length - before} new addresses`);
    before = Object.keys(json.tokens).length; 
    for (const token of Object.keys(newJson.tokens)) {
      json.tokens[token] = newJson.tokens[token];
    }
    log.info(`Merged ${Object.keys(json.tokens).length - before} new tokens`);
    before = json.transactions.length;
    for (const newTx of newJson.transactions) {
      if (!json.transactions.some(tx => tx.hash === newTx.hash)) {
        json.transactions.push(newTx);
      }
    }
    log.info(`Merged ${json.transactions.length - before} new transactions`);
    const oldCalls = JSON.parse(JSON.stringify(json.calls));
    before = Object.keys(oldCalls).length; 
    for (const call of newJson.calls) {
      if (getDups(oldCalls, call) === 0) {
        json.calls.push(call);
      }
    }
    log.info(`Merged ${json.calls.length - before} new calls`);
    if (!store) {
      log.warn(`No store provided, can't save newly merged chain data`);
    } else {
      store.save(StoreKeys.ChainData, json);
    }
    return;
  };

  const getAddressHistory = (...rawAddresses: Address[]): ChainData => {
    const addresses = rawAddresses.map(sm);
    const include = (tx: { hash: HexString }): boolean => addresses.some(
      address => json.addresses[address] && json.addresses[address].history.includes(tx.hash),
    );
    const summary = {};
    addresses.forEach(address => {
      summary[address] = json.addresses[address];
    });
    return getChainData({
      chainDataJson: {
        addresses: summary,
        transactions: json.transactions.filter(include),
        calls: json.calls.filter(include),
        tokens: json.tokens,
      },
      logger,
    });
  };

  const getTokenData =  (token: Address): TokenData =>
    JSON.parse(JSON.stringify(json.tokens[sm(token)] || {}));

  const getEthTransaction = (hash: HexString): EthTransaction => {
    const ethTx = json.transactions.find(tx => tx.hash === hash);
    return ethTx ? JSON.parse(JSON.stringify(ethTx)) : undefined;
  };

  const getEthCall = (hash: HexString): EthCall => {
    const ethCall = json.calls.find(call => call.hash === hash);
    return ethCall ? JSON.parse(JSON.stringify(ethCall)) : undefined;
  };

  const getEthTransactions = (testFn: (_tx: EthTransaction) => boolean): EthTransaction[] =>
    JSON.parse(JSON.stringify(json.transactions.filter(testFn)));

  const getEthCalls = (testFn: (_call: EthCall) => boolean): EthCall[] =>
    JSON.parse(JSON.stringify(json.calls.filter(testFn)));

  const syncTokenData = async (tokens: Address[], key?: string): Promise<void> => {
    assertStore();
    const provider = getProvider(key);
    const newlySupported = tokens.filter(tokenAddress =>
      !json.tokens[tokenAddress] || typeof json.tokens[tokenAddress].decimals !== "number",
    );
    log.info(`Fetching info for ${newlySupported.length} newly supported tokens`);
    for (const tokenAddress of newlySupported) {
      log.info(`⏪ Sent request for token data ${logProg(tokens, tokenAddress)}: ${tokenAddress}`);
      const token = new Contract(tokenAddress, getTokenInterface(tokenAddress), provider);
      const [decimals, name, symbol] = await Promise.all([
        token.functions.decimals(),
        token.functions.name(),
        token.functions.symbol(),
      ]);
      log.info(`➡️  Received data for ${name} [${symbol}] w ${decimals} decimals: ${tokenAddress}`);
      json.tokens[sm(tokenAddress)] = {
        decimals: toNum(decimals || 18),
        name: toStr(name[0] || "Unknown"),
        symbol: toStr(symbol[0] || "???"),
      };
      store.save(StoreKeys.ChainData, json);
    }
  };

  const syncTransaction = async (
    tx: Partial<EthTransaction | EthCall>,
    key?: string,
  ): Promise<void> => {
    assertStore();
    if (!tx || !tx.hash) {
      throw new Error(`Cannot sync a tx w/out a hash: ${JSON.stringify(tx)}`);
    }
    const existing = json.transactions.find(existing => existing.hash === tx.hash);
    if (!getEthTransactionError(existing)) {
      return;
    }

    const provider = getProvider(key);

    log.debug(`⏪ Sent request for tx ${tx.hash}`);
    const [response, receipt] = await Promise.all([
      await provider.getTransaction(tx.hash),
      await provider.getTransactionReceipt(tx.hash),
    ]);
    log.debug(`➡️  Received ${receipt.logs.length} logs for tx ${tx.hash}`);

    const block = toNum(receipt.blockNumber);
    let timestamp;
    if (response.timestamp) {
      timestamp = toTimestamp(response);
    } else {
      log.debug(`⏪ Sent request for block ${block}`);
      const blockData = await provider.getBlock(block);
      log.debug(`➡️  Received data for block ${block}`);
      timestamp = toTimestamp(blockData);
    }

    const newTx = {
      block,
      data: response.data || "0x",
      from: getAddress(response.from),
      gasLimit: toHex(response.gasLimit),
      gasPrice: toHex(response.gasPrice),
      gasUsed: toHex(receipt.gasUsed),
      hash: tx.hash,
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

    const error = getEthTransactionError(newTx);
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

    store.save(StoreKeys.ChainData, json);
    log.debug(`📝 Saved data for tx ${tx.hash}`);
    return;
  };

  const syncAddress = async (address: Address, key?: string): Promise<void> => {
    assertStore();
    if (!json.addresses[address]) {
      json.addresses[address] = { history: [], lastUpdated: new Date(0).toISOString() };
    }
    const lastUpdated = (new Date()).toISOString();
    const [txHistory, callHistory, tokenHistory] = await Promise.all([
      fetchHistory("txlist", address),
      fetchHistory("txlistinternal", address),
      fetchHistory("tokentx", address),
    ]);
    const history = txHistory.concat(callHistory, tokenHistory).map(tx => tx.hash).sort();
    json.addresses[address].history = history;
    const oldEthCalls = JSON.parse(JSON.stringify(json.calls));
    for (const call of callHistory) {
      if (getDups(oldEthCalls, call) > 0) {
        log.debug(`Skipping eth call, dup detected`);
        continue;
      }
      json.calls.push({
        block: toNum(call.blockNumber),
        contractAddress: constants.AddressZero,
        from: sm(call.from),
        hash: call.hash,
        timestamp: toTimestamp(call),
        // Contracts creating contracts: if call.to is empty then this is a contract creation call
        // our target address must be either the call.to or call.from
        to: ((call.to === "" || call.to === null) && !smeq(call.from, address))
          ? address
          : call.to ? sm(call.to) : null,
        value: formatEther(call.value),
      });
    }
    store.save(StoreKeys.ChainData, json);
    log.debug(`📝 Saved calls & history for address ${address}`);
    for (const hash of history) {
      await syncTransaction({ hash }, key);
    }
    json.addresses[address].lastUpdated = lastUpdated;
    store.save(StoreKeys.ChainData, json);
    log.debug(`📝 Saved lastUpdated for address ${address}`);
    return;
  };

  const syncAddresses = async (userAddresses: Address[], key?: string): Promise<void> => {
    const addresses = userAddresses.map(sm).filter(address => {
      if (
        !json.addresses[address] ||
        json.addresses[address].lastUpdated === new Date(0).toISOString()
      ) {
        return true;
      }
      const lastAction = json.transactions
        .filter(tx => json.addresses[address].history.some(hash => hash === tx.hash))
        .map(tx => tx.timestamp)
        .concat(
          json.calls
            .filter(call => smeq(call.to, address) || smeq(call.from, address))
            .map(tx => tx.timestamp),
        )
        .sort(chrono).reverse()[0];
      if (!lastAction) {
        log.debug(`No activity detected for address ${address}`);
        return true;
      }
      const hour = 60 * 60 * 1000;
      const month = 30 * 24 * hour;
      // Don't sync any addresses w no recent activity if they have been synced before
      if (Date.now() - new Date(lastAction).getTime() > 6 * month) {
        log.debug(`Not skipping retired (${lastAction}) address ${address}`);
        return true;
      }
      // Don't sync any active addresses if they've been synced recently
      if (Date.now() - new Date(json.addresses[address].lastUpdated).getTime() < 12 * hour) {
        log.debug(`Not skipping active (${lastAction}) address ${address}`);
        return true;
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
    log.info(`Fetching tx data for ${userAddresses.length} addresses`);
    for (const address of userAddresses) {
      log.info(`Syncing transactions for address ${logProg(userAddresses, address)}: ${address}`);
      for (const hash of json.addresses[address] ? json.addresses[address].history : []) {
        await syncTransaction({ hash }, key);
      }
    }
  };

  ////////////////////////////////////////
  // One more bit of init code before returning

  if (chainDataJson && store) {
    merge(store.load(StoreKeys.ChainData));
    store.save(StoreKeys.ChainData, json);
  }

  return {
    getAddressHistory,
    getEthCall,
    getEthCalls,
    getEthTransaction,
    getEthTransactions,
    getTokenData,
    json,
    merge,
    syncAddress,
    syncAddresses,
    syncTokenData,
  };
};
