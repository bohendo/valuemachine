/* global process */
import fs from "fs";
import axios from "axios";
import { getDefaultProvider } from "ethers";
import { EtherscanProvider } from "ethers/providers";
import { formatEther, hexlify } from "ethers/utils";

import { AddressData, ChainData, InputData } from "./types";
import { getDateString } from "./utils";

const emptyChainData: ChainData = {
  addresses: {},
  blockNumber: 0,
  transactions: {},
};

const emptyAddressData: AddressData = {
  nonce: 0,
  transactions: [],
};

const cacheFile = "./.chain-data.json";

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

export const fetchChaindata = async (input: InputData): Promise<ChainData> => {
  let chainData = loadCache();
  let provider;
  if (process.env.ETHERSCAN_KEY) {
    provider = new EtherscanProvider("homestead", process.env.ETHERSCAN_KEY);
  } else {
    throw new Error("An env var called ETHERSCAN_KEY is required.");
  }

  const blockNumber = await provider.getBlockNumber();
  if (chainData.blockNumber === blockNumber) {
    console.log(`ChainData is up to date, nothing to do`);
    return chainData;
  }
  console.log(`Syncing ChainData with blocks up to: ${blockNumber}`);

  for (const [address, label] of Object.entries(input.addresses)) {
    if (!label.startsWith("self")) { continue; }
    const addressData = chainData.addresses[address] || emptyAddressData;

    console.log(`\nFetching info for ${label} address: ${address}`);

    addressData.nonce = await provider.getTransactionCount(address);
    addressData.hasCode = (await provider.getCode(address)).length > 4;

    const txHistory = await provider.getHistory(address);
    const internalTxHistory = (await axios.get(
      `https://api.etherscan.io/api?module=account&action=txlistinternal&address=${
        address
      }&apikey=${
        process.env.ETHERSCAN_KEY
      }&sort=asc`,
    )).data.result;
    console.log(
      `Retrieved ${txHistory.length} external & ${internalTxHistory.length} internal transactions`,
    );

    addressData.transactions = Array.from(new Set(addressData.transactions.concat(
      txHistory.map(tx => tx.hash),
      internalTxHistory.map(tx => tx.hash),
    )));

    for (const tx of txHistory) {
      chainData.transactions[tx.hash] = {
        block: tx.blockNumber,
        data: tx.data,
        from: tx.from,
        gasLimit: hexlify(tx.gasLimit),
        gasPrice: hexlify(tx.gasPrice),
        hash: tx.hash,
        index: tx.transactionIndex,
        nonce: tx.nonce,
        timestamp: getDateString(new Date(tx.timestamp * 1000)),
        to: tx.to,
        value: formatEther(tx.value),
      };
    }

    chainData.addresses[address] = addressData;
    saveCache(chainData);
  }

  console.log(`Fetching ${
    Object.entries(chainData.transactions).filter(entry => !!entry[1].logs).length
  } transaction receipts`);
  for (const [hash, tx] of Object.entries(chainData.transactions)) {
    if (!tx.gasUsed || !tx.logs) {
      console.log(`Downloading logs for tx ${hash}`);
      const receipt = await provider.getTransactionReceipt(tx.hash);
      tx.gasUsed = hexlify(receipt.gasUsed);
      tx.logs = receipt.logs.map(log => ({
        address: log.address,
        data: log.data,
        index: log.transactionLogIndex,
        topics: log.topics,
      }));
      chainData.transactions[hash] = tx;
      saveCache(chainData);
    }
  }

  chainData.blockNumber = blockNumber;
  saveCache(chainData);
  return chainData;
};
