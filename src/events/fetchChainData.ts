/* global process */
import fs from "fs";
import axios from "axios";
import { getDefaultProvider } from "ethers";
import { EtherscanProvider } from "ethers/providers";
import { formatEther, hexlify } from "ethers/utils";

import { AddressData, ChainData, InputData } from "../types";
import { getDateString } from "../utils";

// Info is stale after 1 hour aka 240 blocks
const blocksUntilStale = 60 * 60 / 15;

const emptyChainData: ChainData = {
  addresses: {},
  block: 0,
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

export const fetchChainData = async (addresses: string[]): Promise<ChainData> => {
  let chainData = loadCache();
  let provider;
  if (process.env.ETHERSCAN_KEY) {
    provider = new EtherscanProvider("homestead", process.env.ETHERSCAN_KEY);
  } else {
    throw new Error("An env var called ETHERSCAN_KEY is required.");
  }

  console.log(`💫 getting block number..`);
  const block = await provider.getBlockNumber();
  console.log(`✅ block: ${block}\n`);

  if (block <= chainData.block + blocksUntilStale) {
    console.log(`ChainData is up to date (${block - chainData.block} blocks old)\n`);
    return chainData;
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
    console.log(`💫 getting code..`);
    addressData.hasCode = (await provider.getCode(address)).length > 4;
    console.log(`✅ addressData.hasCode: ${addressData.hasCode}`);

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
        process.env.ETHERSCAN_KEY
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
        chainData.transactions[tx.hash] = {
          block: tx.blockNumber,
          data: tx.data,
          from: tx.from,
          gasLimit: tx.gasLimit ? hexlify(tx.gasLimit) : undefined,
          gasPrice: tx.gasPrice ? hexlify(tx.gasPrice) : undefined,
          hash: tx.hash,
          index: tx.transactionIndex,
          nonce: tx.nonce,
          timestamp: getDateString(new Date(tx.timestamp * 1000)),
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

  chainData.block = block;
  saveCache(chainData);
  return chainData;
};
