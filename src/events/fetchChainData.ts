import fs from "fs";
import axios from "axios";
import { getDefaultProvider } from "ethers";
import { EtherscanProvider } from "ethers/providers";
import { formatEther, hexlify } from "ethers/utils";

import { AddressData, ChainData, InputData } from "../types";

// Info is stale after 6 hour
const timeUntilStale = 6 * 60 * 60 * 1000;
const blocksUntilStale = timeUntilStale / (15 * 1000);

const emptyChainData: ChainData = {
  addresses: {},
  lastUpdated: (new Date(0)).toISOString(),
  transactions: {},
};

const emptyAddressData: AddressData = {
  block: 0,
  nonce: 0,
  transactions: [],
};

const cacheFile = "./chain-data.json";

const loadCache = (): ChainData => {
  try {
    return JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  } catch (e) {
    if (e.message.startsWith("ENOENT: no such file or directory")) {
      return emptyChainData;
    }
    console.warn(e.message);
    throw new Error(`Unable to load chainData cache, try deleting ${cacheFile} & try again`);
  }
};

const saveCache = (chainData: ChainData): void =>
  fs.writeFileSync(cacheFile, JSON.stringify(chainData, null, 2));

export const fetchChainData = async (addresses: string[], etherscanKey: string): Promise<ChainData> => {
  let chainData = loadCache();

  // Don't fetch anything if we don't have any addresses to scan
  if (!addresses || addresses.length === 0) {
    return chainData;
  }

  if (!etherscanKey) {
    throw new Error("To track eth activity, you must provide an etherscanKey property in input");
  }

  const lastUpdated = new Date(chainData.lastUpdated).getTime();
  if (Date.now() <= lastUpdated + timeUntilStale) {
    console.log(`ChainData is up to date (${Math.round((Date.now() - lastUpdated) / (1000 * 60))} minutes old)\n`);
    return chainData;
  }

  const provider = new EtherscanProvider("homestead", etherscanKey);
  let block;
  try {
  console.log(`💫 getting block number..`);
  block = await provider.getBlockNumber();
  console.log(`✅ block: ${block}\n`);
  } catch (e) {
    if (e.message.includes("invalid response - 0")) {
      console.warn(`Network error, couldn't fetch chain data (Are you offline?)`);
      return chainData;
    } else {
      throw e;
    }
  }

  for (const address of addresses) {
    const addressData = JSON.parse(JSON.stringify(
      chainData.addresses[address] || emptyAddressData,
    ));

    if (block <= addressData.block + blocksUntilStale) {
      console.log(`Info for ${address} is up to date (${block - addressData.block} blocks old)`);
      continue;
    }
    console.log(`Fetching info for address: ${address}`);

    // note: via create2, addresses can start out w/out code & later code appears
    if (!addressData.hasCode) {
      console.log(`💫 getting code..`);
      addressData.hasCode = (await provider.getCode(address)).length > 4;
      console.log(`✅ addressData.hasCode: ${addressData.hasCode}`);
    }

    if (!addressData.hasCode) {
      console.log(`💫 getting nonce..`);
      addressData.nonce = await provider.getTransactionCount(address);
      console.log(`✅ addressData.nonce: ${addressData.nonce}`);
    }

    console.log(`💫 getting externaltxHistory..`);
    const externaltxHistory = await provider.getHistory(address);
    console.log(`✅ externaltxHistory: ${externaltxHistory.length} logs`);

    console.log(`💫 getting internaltxHistory..`);
    const internalTxHistory = (await axios.get(
      `https://api.etherscan.io/api?module=account&action=txlistinternal&address=${
        address
      }&apikey=${
        etherscanKey
      }&sort=asc`,
    )).data.result;
    console.log(`✅ internalTxHistory: ${internalTxHistory.length} logs`);

    const txHistory = externaltxHistory.concat(internalTxHistory);

    addressData.transactions = Array.from(new Set(addressData.transactions.concat(
      txHistory.map(tx => tx.hash),
    )));

    chainData.addresses[address] = addressData;

    for (const tx of txHistory) {
      if (tx && tx.hash && !chainData.transactions[tx.hash]) {
        const timestamp = tx.timestamp || (tx as any).timeStamp;
        chainData.transactions[tx.hash] = {
          block: tx.blockNumber,
          call: (tx as any).type === "call",
          data: tx.data,
          from: tx.from,
          gasLimit: tx.gasLimit ? hexlify(tx.gasLimit) : undefined,
          gasPrice: tx.gasPrice ? hexlify(tx.gasPrice) : undefined,
          hash: tx.hash,
          nonce: tx.nonce,
          timestamp: (new Date(timestamp * 1000)).toISOString(),
          to: tx.to,
          value: formatEther(tx.value),
        };
      }
    }

    console.log(`📝 saving progress..`);
    addressData.block = block;
    saveCache(chainData);
    console.log(`🔖 progress saved\n`);
  }

  console.log(`Fetching ${
    Object.values(chainData.transactions).filter(tx => !tx.logs).length
  } transaction receipts`);

  for (const [hash, tx] of Object.entries(chainData.transactions)) {
    if (!tx.gasUsed || !tx.logs) {
      console.log(`💫 getting logs for tx ${hash}..`);
      const receipt = await provider.getTransactionReceipt(tx.hash);
      tx.gasUsed = hexlify(receipt.gasUsed);
      tx.index = receipt.transactionIndex;
      tx.logs = receipt.logs.map(log => ({
        address: log.address,
        data: log.data,
        index: log.transactionLogIndex,
        topics: log.topics,
      }));
    console.log(`✅ got ${tx.logs.length} log${tx.logs.length > 1 ? "s" : ""}`);
      chainData.transactions[hash] = tx;
      saveCache(chainData);
    }
  }

  chainData.lastUpdated = (new Date()).toISOString();
  saveCache(chainData);
  return chainData;
};
