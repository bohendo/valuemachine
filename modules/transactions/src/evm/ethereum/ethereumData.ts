import { isAddress as isEvmAddress, getAddress as getEvmAddress } from "@ethersproject/address";
import { hexlify } from "@ethersproject/bytes";
import { formatEther } from "@ethersproject/units";
import {
  EvmAddress,
  AddressBook,
  Bytes32,
  Cryptocurrencies,
  EvmData,
  EvmDataParams,
  EvmNames,
  EvmParser,
  EvmTransaction,
  EvmTransfer,
  StoreKeys,
  Transaction,
  TransactionsJson,
} from "@valuemachine/types";
import {
  chrono,
  dedup,
  getBytes32Error,
  getEmptyEvmData,
  getEvmDataError,
  getEvmTransactionError,
  getLogger,
} from "@valuemachine/utils";
import axios from "axios";

import { parseEthTx } from "./parser";

export const getEthereumData = (params?: EvmDataParams): EvmData => {
  const { covalentKey, etherscanKey, json: ethDataJson, logger, store } = params || {};
  const log = (logger || getLogger()).child?.({ module: "EthereumData" });
  const json = ethDataJson || store?.load(StoreKeys.EthereumData) || getEmptyEvmData();
  const save = () => store
    ? store.save(StoreKeys.EthereumData, json)
    : log.debug(`No store provided, can't save eth data`);

  const error = getEvmDataError(json);
  if (error) throw new Error(error);

  log.info(`Loaded eth data containing ${
    Object.keys(json.transactions).length
  } EthTxs from ${ethDataJson ? "input" : store ? "store" : "default"}`);

  const metadata = {
    id: 1,
    name: EvmNames.Ethereum,
    feeAsset: Cryptocurrencies.ETH,
  };

  ////////////////////////////////////////
  // Internal Helper Functions

  // CAIP-10
  const getAddress = (address: string): string => `evm:${metadata.id}:${getEvmAddress(address)}`;

  const formatCovalentTx = (rawTx): EvmTransaction => ({
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
    nonce: 0, // not available?
    status: rawTx.successful ? 1 : 0,
    timestamp: rawTx.block_signed_at,
    transfers: [], // not available from covalent, get from etherscan
    to: rawTx.to_address ? getAddress(rawTx.to_address) : null,
    value: formatEther(rawTx.value),
  });

  const formatEtherscanTransfer = (rawTransfer): EvmTransfer => ({
    to: getAddress(rawTransfer.to),
    from: getAddress(rawTransfer.from),
    value: formatEther(rawTransfer.value),
  });

  const queryCovalent = async (path: string, query?: any): Promise<any> => {
    if (!covalentKey) throw new Error(`A covalent api key is required to sync eth data`);
    const url = `https://api.covalenthq.com/v1/${path}/?${
      Object.entries(query || {}).reduce((querystring, entry) => {
        querystring += `${entry[0]}=${entry[1]}&`;
        return querystring;
      }, "")
    }key=${covalentKey}`;
    log.debug(`GET ${url.replace(/\??(api)?key=[^&]+&?/, "")}`);
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

  const queryEtherscan = async (
    action: string,
    address: EvmAddress,
  ): Promise<any[] | undefined> => {
    const target = action === "txlist" ? "transaction history"
      : action === "txlistinternal" ? "internal call history"
      : action === "tokentx" ? "token history"
      : "";
    const url = `https://api.etherscan.io/api?module=account&` +
      `action=${action}&` +
      `address=${address}&` +
      `apikey=${etherscanKey || ""}&sort=asc`;
    log.debug(`GET ${url.replace(/\??(api)?key=[^&]+&?/, "")}`);
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

  const fetchTransfersByTx = async (txHash: Bytes32): Promise<EvmTransfer[]> => {
    if (!etherscanKey) {
      log.warn(`An etherscan api key is required to fetch internal transfers`);
      return [];
    }
    const url = `https://api.etherscan.io/api?module=account&` +
      `action=txlistinternal&` +
      `txhash=${txHash}&` +
      `apikey=${etherscanKey || ""}&sort=asc`;
    try {
      log.debug(`GET ${url.replace(/\??(api)?key=[^&]+&?/, "")}`);
      const result = (await axios.get(url, { timeout: 10000 })).data.result;
      if (typeof result === "string") {
        log.warn(`Failed to get internal transfers for tx ${txHash}: ${result}`);
        return [];
      }
      log.info(`Received ${result.length} internal transfers from Etherscan`);
      return result.map(formatEtherscanTransfer);
    } catch (e) {
      log.warn(e.message);
      return [];
    }
  };

  const fetchTx = async (txHash: Bytes32): Promise<EvmTransaction> => {
    log.info(`Fetching transaction ${txHash}`);
    const [txRes, transferRes] = await Promise.all([
      queryCovalent(`${metadata.id}/transaction_v2/${txHash}`),
      fetchTransfersByTx(txHash),
    ]);
    if (txRes?.items?.[0]) {
      const tx = formatCovalentTx(txRes?.items?.[0]);
      tx.transfers = transferRes;
      return tx;
    } else {
      throw new Error(`Failed to fetch tx ${txHash}`);
    }
  };

  const logProg = (list: any[], elem: any): string =>
    `${list.indexOf(elem)+1}/${list.length}`;

  /* It really sucks to get a full tx from Etherscan, use Covalent instead
  const fetchEtherscanTx = async (txHash: Bytes32): Promise<EvmTransaction> => {
    log.warn(`Fetching transactions from Etherscan is slow, provide covalent api key to speed up`);
    const provider = new EtherscanProvider("homestead", etherscanKey);
    const [response, receipt] = await Promise.all([
      await provider.getTransaction(txHash),
      await provider.getTransactionReceipt(txHash),
    ]);
    log.debug(`Fetched transaction + receipt from etherscan for tx ${txHash}`);
    const toNum = (num: BigNumber | number): number =>
      parseInt(toBN(num.toString()).toString(), 10);
    const block = toNum(receipt.blockNumber);
    const toTimestamp = (tx: any): string => {
      const val = `${tx.timestamp || tx.timeStamp}`;
      try {
        if (val.match(/^[0-9]+$/)) {
          return new Date(parseInt(val) * 1000).toISOString();
        } else {
          return new Date(val).toISOString();
        }
      } catch (e) {
        log.error(`Failed to get timestamp from object: ${
          JSON.stringify(tx, null, 2)
        }: ${e.stack}`);
        throw e;
      }
    };
    let timestamp;
    if (response.timestamp) {
      timestamp = toTimestamp(response);
    } else {
      const blockData = await provider.getBlock(block);
      timestamp = toTimestamp(blockData);
      log.debug(`Fetched timestamp from etherscan for block ${block}: ${timestamp}`);
    }
    const toHex = (num: BigNumber | number): string => hexlify(toBN(num));
    const newTx = {
      // block,
      // data: response.data || "0x",
      from: getAddress(response.from),
      // gasLimit: toHex(response.gasLimit),
      gasPrice: toHex(response.gasPrice),
      gasUsed: toHex(receipt.gasUsed),
      hash: txHash,
      // index: receipt.transactionIndex,
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
      transfers: [], // need a separate call to etherscan to get this info
      value: formatEther(response.value),
    };
    return newTx;
  };
  */

  /*
  const syncAddress = async (_address: EvmAddress): Promise<void> => {
    const address = getAddress(_address);
    if (!json.addresses[address]) {
      json.addresses[address] = { history: [], lastUpdated: new Date(0).toISOString() };
    }
    const lastUpdated = (new Date()).toISOString();
    const [txHistory, callHistory, tokenHistory] = await Promise.all([
      queryEtherscan("txlist", address),
      queryEtherscan("txlistinternal", address),
      queryEtherscan("tokentx", address),
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
    json.addresses[address].lastUpdated = lastUpdated;
    save();
    log.info(`Saved history & lastUpdated for address ${address}`);
    for (const hash of history) {
      await syncTransaction(hash);
    }
    return;
  };
  */

  // Beware of edge case: a tx makes 2 identical internal transfers and
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

  const syncAddress = async (rawAddress: EvmAddress): Promise<void> => {
    const address = getEvmAddress(
      rawAddress.includes(":") ? rawAddress.split(":").pop() : rawAddress
    );
    let data = await queryCovalent(`${metadata.id}/address/${address}/transactions_v2`);
    const covalentTxns = [];
    covalentTxns.push(...data?.items);
    while (covalentTxns && data.pagination.has_more) {
      data = await queryCovalent(`${metadata.id}/address/${address}/transactions_v2`, {
        ["page-number"]: data.pagination.page_number + 1,
      });
      covalentTxns.push(...data.items);
    }
    const txns = covalentTxns.map(formatCovalentTx);
    const transfers = await queryEtherscan("txlistinternal", address);
    const history = dedup(txns.map(tx => tx.hash).concat(transfers.map(t => t.hash))).sort();
    log.info(`Found ${history.length} historical transactions for ${address}`);
    json.addresses[address] = {
      lastUpdated: new Date().toISOString(),
      history,
    };
    save();
    for (const txHash of history) {
      let tx = txns.find(tx => tx.hash === txHash);
      if (tx) {
        const oldTransfers = JSON.parse(JSON.stringify(tx.transfers));
        for (const transfer of transfers.filter(t => t.hash === txHash)) {
          if (getDups(oldTransfers, transfer) === 0) {
            tx.transfers.push(transfer);
          }
        }
      } else {
        tx = await fetchTx(txHash);
      }
      const error = getEvmTransactionError(tx);
      if (error) throw new Error(error);
      json.transactions[tx.hash] = tx;
      save();
    }
    return;
  };

  ////////////////////////////////////////
  // Exported Methods

  const syncTransaction = async (
    txHash: string,
  ): Promise<void> => {
    const txHashError = getBytes32Error(txHash);
    if (txHashError) throw new Error(txHashError);
    const existing = json.transactions[txHash];
    if (!getEvmTransactionError(existing)) {
      return;
    }
    const tx = await fetchTx(txHash);
    const error = getEvmTransactionError(tx);
    if (error) {
      throw new Error(error);
    }
    json.transactions[txHash] = tx;
    save();
    return;
  };

  const syncAddressBook = async (addressBook: AddressBook): Promise<void> => {
    const zeroDate = new Date(0).toISOString();
    const selfAddresses = addressBook.json
      .map(entry => entry.address)
      .filter(address => addressBook.isSelf(address))
      .map(address =>
        address.startsWith(`evm:${metadata.id}:`) ? address.split(":").pop() // CAIP-10 on this evm
        : address.includes(":") ? "" // CAIP-10 address on different evm
        : address // non-CAIP-10 address
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
      const lastAction = json.addresses[address].history
        .map(txHash => json.transactions[txHash].timestamp || new Date(0))
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
    extraParsers?: EvmParser[],
  ): TransactionsJson => {
    const selfAddresses = addressBook.json
      .map(entry => entry.address)
      .filter(address => addressBook.isSelf(address))
      .map(address =>
        address.startsWith(`evm:${metadata.id}:`) ? address.split(":").pop() // CAIP-10 on this evm
        : address.includes(":") ? "" // CAIP-10 address on different evm
        : address // non-CAIP-10 address
      )
      .filter(address => isEvmAddress(address))
      .map(address => getEvmAddress(address));
    const selfTransactionHashes = Array.from(new Set(
      selfAddresses.reduce((all, address) => {
        log.info(`Adding ${json.addresses[address]?.history?.length || 0} entries for ${address} (${all.length} so far)`);
        return all.concat(json.addresses[address]?.history || []);
      }, [])
    ));
    log.info(`Parsing ${selfTransactionHashes.length} eth transactions`);
    return selfTransactionHashes.map(hash => parseEthTx(
      json.transactions[hash],
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
