import fs from "fs";
import axios from "axios";
import { AddressZero } from "ethers/constants";
import { EtherscanProvider } from "ethers/providers";
import { formatEther, hexlify } from "ethers/utils";

import { env } from "./env";
import { AddressBook, ChainData } from "./types";
import { Logger } from "./utils";

// Re-fetch tx history for active addresses if >6 hours since last check
const timeUntilStale = 6 * 60 * 60 * 1000;
const reCheckRetired = false;

const emptyChainData: ChainData = {
  addresses: {},
  calls: [],
  lastUpdated: (new Date(0)).toISOString(),
  transactions: {},
};

const cacheFile = "./chain-data.json";

const loadCache = (): ChainData => {
  try {
    return JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  } catch (e) {
    if (e.message.startsWith("ENOENT: no such file or directory")) {
      return emptyChainData;
    }
    new Logger("LoadChainDataCache", env.logLevel).warn(e.message);
    throw new Error(`Unable to load chainData cache, try deleting ${cacheFile} & try again`);
  }
};

const saveCache = (chainData: ChainData): void =>
  fs.writeFileSync(cacheFile, JSON.stringify(chainData, null, 2));

export const getChainData = async (addressBook: AddressBook): Promise<ChainData> => {
  const log = new Logger("FetchChainData", env.logLevel);
  const etherscanKey = env.etherscanKey;

  const chainData = loadCache();

  const activeAddresses = addressBook.addresses
    .filter(a => a.category === "self" && a.tags.includes("active") && !a.tags.includes("ignore"))
    .map(a => a.address.toLowerCase());

  const retiredAddresses = addressBook.addresses
    .filter(a => a.category === "self" && !a.tags.includes("active") && !a.tags.includes("ignore"))
    .map(a => a.address.toLowerCase());

  const addresses = activeAddresses.concat(retiredAddresses);

  // Don't fetch anything if we don't have any addresses to scan
  if (!addresses || addresses.length === 0) {
    return chainData;
  }

  if (!etherscanKey) {
    throw new Error("To track eth activity, you must provide an etherscanKey");
  }

  const lastUpdated = new Date(chainData.lastUpdated).getTime();
  if (Date.now() <= lastUpdated + timeUntilStale) {
    log.info(`ChainData is up to date (${Math.round((Date.now() - lastUpdated) / (1000 * 60))} minutes old)\n`);
    return chainData;
  }

  const provider = new EtherscanProvider("homestead", etherscanKey);
  let block;
  try {
    log.info(`💫 getting block number..`);
    block = await provider.getBlockNumber();
    log.info(`✅ block: ${block}\n`);
  } catch (e) {
    if (e.message.includes("invalid response - 0")) {
      log.warn(`Network error, couldn't fetch chain data (Are you offline?)`);
      return chainData;
    } else {
      throw e;
    }
  }

  for (const address of addresses) {
    const lastUpdated = chainData.addresses[address];
    const timeDiff = lastUpdated ? Date.now() - new Date(lastUpdated).getTime() : 0;

    if (reCheckRetired || (lastUpdated && retiredAddresses.includes(address))) {
      log.debug(`Retired address ${address} data has already been fetched`);
      continue;
    }
    
    if (timeDiff > timeUntilStale) {
      log.info(`Active address ${address} was updated ${timeDiff / (60 * 1000)} minues ago`);
      continue;
    }
    log.info(`Fetching info for address: ${address}`);

    log.info(`💫 getting externaltxHistory..`);
    const externaltxHistory = await provider.getHistory(address);
    log.info(`✅ externaltxHistory: ${externaltxHistory.length} logs`);

    for (const tx of externaltxHistory) {
      if (tx && tx.hash && !chainData.transactions[tx.hash]) {
        chainData.transactions[tx.hash] = {
          block: tx.blockNumber,
          data: tx.data,
          from: tx.from,
          gasLimit: tx.gasLimit ? hexlify(tx.gasLimit) : undefined,
          gasPrice: tx.gasPrice ? hexlify(tx.gasPrice) : undefined,
          hash: tx.hash,
          nonce: tx.nonce,
          timestamp: (new Date(tx.timestamp * 1000)).toISOString(),
          to: tx.to,
          value: formatEther(tx.value),
        };
      }
    }

    log.info(`💫 getting internalTxHistory..`);
    const internalTxHistory = (await axios.get(
      `https://api.etherscan.io/api?module=account&action=txlistinternal&address=${
        address
      }&apikey=${
        etherscanKey
      }&sort=asc`,
    )).data.result;
    log.info(`✅ internalTxHistory: ${internalTxHistory.length} logs`);

    log.info(`💫 getting tokenTxHistory..`);
    const tokenTxHistory = (await axios.get(
      `https://api.etherscan.io/api?module=account&action=tokentx&address=${
        address
      }&apikey=${
        etherscanKey
      }&sort=asc`,
    )).data.result;
    log.info(`✅ tokenTxHistory: ${tokenTxHistory.length} logs`);

    for (const tx of tokenTxHistory) {
      chainData.calls.push({
        block: parseInt(tx.blockNumber.toString(), 10),
        contractAddress: tx.contractAddress,
        from: tx.from,
        hash: tx.hash,
        timestamp: (new Date((tx.timestamp || tx.timeStamp) * 1000)).toISOString(),
        to: tx.to,
        value: formatEther(tx.value),
      });
    }

    // edge case: a tx makes 2 identical eth internal transfers
    // We don't want to add these transfers twice for each of from & to
    // But we still want these two identical eth transfers to be added

    const oldCalls = JSON.parse(JSON.stringify(chainData.calls));
    for (const tx of internalTxHistory) {
      const oldDups = oldCalls.filter(call =>
        tx.from === call.from &&
        tx.hash === call.hash &&
        tx.to === call.to &&
        tx.value === call.value,
      ).length;
      if (oldDups === 0) {
        chainData.calls.push({
          block: parseInt(tx.blockNumber.toString(), 10),
          contractAddress: AddressZero,
          from: tx.from,
          hash: tx.hash,
          timestamp: (new Date((tx.timestamp || tx.timeStamp) * 1000)).toISOString(),
          to: tx.to,
          value: formatEther(tx.value),
        });
      } else {
        continue;
      }
    }

    chainData.addresses[address] = new Date().toISOString();
    saveCache(chainData);
    log.info(`📝 progress saved\n`);
  }

  log.info(`Fetching ${
    Object.values(chainData.transactions).filter(tx => !tx.logs).length
  } transaction receipts`);

  // Scan all new transactions & fetch logs for any that don't have them yet
  for (const [hash, tx] of Object.entries(chainData.transactions)) {
    if (!tx.gasUsed || !tx.logs) {
      log.info(`💫 getting logs for tx ${hash}..`);
      const receipt = await provider.getTransactionReceipt(tx.hash);
      tx.gasUsed = hexlify(receipt.gasUsed);
      tx.index = receipt.transactionIndex;
      tx.logs = receipt.logs.map(log => ({
        address: log.address,
        data: log.data,
        index: log.transactionLogIndex,
        topics: log.topics,
      }));
    log.info(`✅ got ${tx.logs.length} log${tx.logs.length > 1 ? "s" : ""}`);
      chainData.transactions[hash] = tx;
      saveCache(chainData);
    }
  }

  chainData.lastUpdated = (new Date()).toISOString();
  saveCache(chainData);
  return chainData;
};
