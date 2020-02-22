import fs from "fs";
import axios from "axios";
import { AddressZero } from "ethers/constants";
import { EtherscanProvider } from "ethers/providers";
import { formatEther, hexlify } from "ethers/utils";

import { AddressBook, AddressData, ChainData } from "../types";

// Info is stale after 6 hour
const timeUntilStale = 6 * 60 * 60 * 1000;
const blocksUntilStale = timeUntilStale / (15 * 1000);

const emptyChainData: ChainData = {
  addresses: {},
  calls: {},
  lastUpdated: (new Date(0)).toISOString(),
  transactions: {},
};

const emptyAddressData: AddressData = {
  address: AddressZero,
  block: 0,
  hasCode: false,
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

export const fetchChainData = async (
  addressBook: AddressBook,
  etherscanKey: string,
): Promise<ChainData> => {
  const chainData = loadCache();

  const activeAddresses = addressBook
    .filter(a => a.category === "self" && a.tags.includes("active"))
    .map(a => a.address.toLowerCase());

  const retiredAddresses = addressBook
    .filter(a => a.category === "self" && !a.tags.includes("active"))
    .map(a => a.address.toLowerCase());

  const addresses = activeAddresses.concat(retiredAddresses);

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
    addressData.address = address;

    if (addressData.block > 0 && retiredAddresses.includes(address)) {
      // console.log(`Retired address ${address} data has already been fetched`);
      continue;
    }

    if (block <= addressData.block + blocksUntilStale) {
      console.log(`Active address ${address} was updated ${block - addressData.block} blocks ago`);
      continue;
    }
    console.log(`Fetching info for address: ${address}`);

    // note: via create2, addresses can start out w/out code & later code appears
    if (!addressData.hasCode) {
      console.log(`💫 getting code..`);
      addressData.hasCode = (await provider.getCode(address)).length > 4;
      console.log(`✅ addressData.hasCode: ${addressData.hasCode}`);
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

    for (const tx of internalTxHistory) {
      if (tx && tx.hash && !chainData.calls[tx.hash]) {
        chainData.calls[tx.hash] = {
          block: parseInt(tx.blockNumber.toString(), 10),
          from: tx.from,
          hash: tx.hash,
          timestamp: (new Date((tx.timestamp || (tx as any).timeStamp) * 1000)).toISOString(),
          to: tx.to,
          value: formatEther(tx.value),
        };
      }
    }

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

    addressData.block = block;
    saveCache(chainData);
    console.log(`📝 progress saved\n`);
  }

  console.log(`Fetching ${
    Object.values(chainData.transactions).filter(tx => !tx.logs).length
  } transaction receipts`);

  // Scan all new transactions & fetch logs for any that don't have them yet
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
