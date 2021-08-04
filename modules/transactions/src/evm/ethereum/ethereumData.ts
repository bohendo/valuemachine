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
// eslint-disable-next-line import/no-unresolved
import getQueue from "queue";

import { parseEthTx } from "./parser";

export const getEthereumData = (params?: EvmDataParams): EvmData => {
  const { covalentKey, etherscanKey, json: ethDataJson, logger, store } = params || {};
  const log = (logger || getLogger()).child?.({ module: "EthereumData" });
  const json = ethDataJson || store?.load(StoreKeys.EthereumData) || getEmptyEvmData();
  const save = () => store
    ? store.save(StoreKeys.EthereumData, json)
    : undefined; // log.debug(`No store provided, can't save eth data`);

  const inputError = getEvmDataError(json);
  if (inputError) throw new Error(inputError);

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
    to: rawTransfer.to ? getAddress(rawTransfer.to) : null,
    from: getAddress(rawTransfer.from),
    value: formatEther(rawTransfer.value),
  });

  const retry = async (attempt: () => Promise<any>): Promise<any> => {
    let response;
    const assertResponse = (res: any): void => {
      if (typeof res === "string") throw new Error(res);
      if (res.status !== 200) throw new Error(`Bad response status: ${res.status} (${Object.keys(res)})`);
      if (res.data.error) throw new Error(res.data.error_message);
    };
    try {
      response = await attempt();
      assertResponse(response);
    } catch (e) {
      const msg = e.message.toLowerCase();
      if (msg.includes("timeout") || msg.includes("eai_again")) {
        log.warn(`Request timed out, trying one more time..`);
        await new Promise(res => setTimeout(res, 1000)); // short pause
        response = await attempt();
      } else if (msg.includes("rate limit") || msg.includes("429")) {
        log.warn(`We're rate limited, pausing then trying one more time..`);
        await new Promise(res => setTimeout(res, 8000)); // long pause
        response = await attempt();
      } else {
        throw e;
      }
    }
    assertResponse(response);
    return response;
  };

  const queryEtherscan = async (
    target: EvmAddress | Bytes32,
  ): Promise<any> => {
    const targetType = isEvmAddress(target) ? "address" : "txhash";
    const url = `https://api.etherscan.io/api?module=account&` +
      `action=txlistinternal&` +
      `${targetType}=${target}&` +
      `apikey=${etherscanKey || ""}&sort=asc`;
    const attempt = async () => {
      log.debug(`GET ${url.replace(/\??(api)?key=[^&]+&?/, "")}`);
      return await axios.get(url, { timeout: 10000 });
    };
    try {
      const response = await retry(attempt);
      return response?.data?.result;
    } catch (e) {
      log.error(e.message);
    }
    return undefined;
  };

  const queryCovalent = async (path: string, args?: any): Promise<any> => {
    if (!covalentKey) throw new Error(`A covalent api key is required to sync eth data`);
    const url = `https://api.covalenthq.com/v1/${path}/?${
      Object.entries(args || {}).reduce((argString, entry) => {
        argString += `${entry[0]}=${entry[1]}&`;
        return argString;
      }, "")
    }key=${covalentKey}`;
    const attempt = async () => {
      log.debug(`GET ${url.replace(/\??(api)?key=[^&]+&?/, "")}`);
      return await axios.get(url, { timeout: 10000 });
    };
    try {
      const response = await retry(attempt);
      return response?.data?.data;
    } catch (e) {
      log.error(e.message);
    }
    return undefined;
  };

  const fetchTransfers = async (txHash: Bytes32): Promise<EvmTransfer[]> => {
    const transfers = await queryEtherscan(txHash);
    if (transfers) {
      return transfers.map(formatEtherscanTransfer);
    } else {
      throw new Error(`Failed to fetch internal transfers for tx ${txHash}`);
    }
  };

  const fetchTransferHistory = async (address: EvmAddress): Promise<Bytes32[]> => {
    const transfers = await queryEtherscan(address);
    if (transfers) {
      return transfers.map(t => t.hash).filter(hash => !!hash).sort();
    } else {
      throw new Error(`Failed to fetch internal transfer history for ${address}`);
    }
  };

  const fetchTxHistory = async (address: EvmAddress): Promise<EvmTransaction[]> => {
    let data = await queryCovalent(`${metadata.id}/address/${address}/transactions_v2`);
    if (!data?.items) {
      throw new Error(`Failed to fetch transaction history for ${address}`);
    }
    const transactions = [];
    transactions.push(...data.items);
    while (transactions && data.pagination.has_more) {
      data = await queryCovalent(`${metadata.id}/address/${address}/transactions_v2`, {
        ["page-number"]: data.pagination.page_number + 1,
      });
      if (data?.items) transactions.push(...data.items);
    }
    return transactions.map(formatCovalentTx);
  };

  const fetchTx = async (txHash: Bytes32): Promise<EvmTransaction> => {
    const tx = await queryCovalent(`${metadata.id}/transaction_v2/${txHash}`);
    if (tx?.items?.[0]) {
      return formatCovalentTx(tx?.items?.[0]);
    } else {
      throw new Error(`Failed to fetch transaction ${txHash}`);
    }
  };

  /*
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
  */

  const syncAddress = async (rawAddress: EvmAddress): Promise<void> => {
    const address = getEvmAddress(
      rawAddress.includes(":") ? rawAddress.split(":").pop() : rawAddress
    );
    log.info(`Fetching transaction history of ${address}`);
    const [transactions, transferHashes] = await Promise.all([
      fetchTxHistory(address),
      fetchTransferHistory(address),
    ]);
    const history = dedup(transactions.map(tx => tx.hash).concat(transferHashes)).sort();
    json.addresses[address] = {
      lastUpdated: new Date().toISOString(),
      history,
    };
    save();
    log.info(`Saved ${history.length} historical transactions for ${address}`);
    const q = getQueue({ autostart: true, concurrency: 4 });
    history.forEach(txHash => {
      q.push(async () => {
        if (!getEvmTransactionError(json.transactions[txHash])) {
          return;
        }
        log.info(`Syncing transaction data for ${txHash}`);
        let tx = transactions.find(tx => tx.hash === txHash);
        if (tx) {
          // etherscan only returns transfers relevant to the given address, get the rest of them
          tx.transfers = await fetchTransfers(tx.hash);
        } else {
          const [txRes, transfers] = await Promise.all([
            fetchTx(txHash),
            fetchTransfers(txHash),
          ]);
          tx = txRes;
          tx.transfers = transfers;
        }
        const txError = getEvmTransactionError(tx);
        if (txError) throw new Error(txError);
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
    const [tx, transfers] = await Promise.all([
      fetchTx(txHash),
      fetchTransfers(txHash),
    ]);
    tx.transfers = transfers;
    const txError = getEvmTransactionError(tx);
    if (txError) throw new Error(txError);
    json.transactions[txHash] = tx;
    save();
    return;
  };

  const syncAddressBook = async (addressBook: AddressBook): Promise<void> => {
    const zeroDate = new Date(0).toISOString();
    const selfAddresses = Object.values(addressBook.json)
      .map(entry => entry.address)
      .filter(address => addressBook.isSelf(address))
      .map(address =>
        address.startsWith(`evm:${metadata.id}:`) ? address.split(":").pop() // address on this evm
        : address.includes(":") ? "" // address on a different evm
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
    extraParsers?: EvmParser[],
  ): TransactionsJson => {
    const selfAddresses = Object.values(addressBook.json)
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
