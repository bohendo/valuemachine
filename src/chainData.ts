import axios from "axios";
import { AddressZero } from "ethers/constants";
import { EtherscanProvider } from "ethers/providers";
import { bigNumberify, formatEther, hexlify } from "ethers/utils";

import { env } from "./env";
import { loadChainData, saveChainData } from "./cache";
import { AddressBook, ChainData } from "./types";
import { eq, Logger } from "./utils";

const toDecStr = (hex: string): string => bigNumberify(hex).toString();

// Re-fetch tx history for active addresses if >6 hours since last check
const timeUntilStale = 6 * 60 * 60 * 1000;
const reCheckRetired = false;

export const getChainData = async (addressBook: AddressBook): Promise<ChainData> => {
  const log = new Logger("FetchChainData", env.logLevel);
  const etherscanKey = env.etherscanKey;
  const chainData = loadChainData();
  const addresses = addressBook.addresses.filter(addressBook.isSelf);
  const activeAddresses = addresses.filter(addressBook.isTagged("active"));
  const retiredAddresses= addresses.filter(a => !activeAddresses.includes(a));

  // Don't fetch anything if we don't have any addresses to scan
  if (!addresses || addresses.length === 0) {
    return chainData;
  }

  const lastUpdated = new Date(chainData.lastUpdated).getTime();
  if (Date.now() <= lastUpdated + timeUntilStale) {
    log.info(`ChainData is up to date (${Math.round((Date.now() - lastUpdated) / (1000 * 60))} minutes old)`);
    return chainData;
  }

  if (!etherscanKey) {
    throw new Error("To track eth activity, you must provide an etherscanKey");
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
    const timeDiff = lastUpdated ? Date.now() - new Date(lastUpdated).getTime() : Date.now();

    if (reCheckRetired || (lastUpdated && retiredAddresses.includes(address))) {
      log.debug(`Retired address ${address} data was already fetched ${new Date(timeDiff).toISOString()} ago`);
      continue;
    }

    if (timeDiff < timeUntilStale) {
      log.info(`Active address ${address} was updated ${timeDiff / (60 * 1000)} minutes ago`);
      continue;
    }
    log.info(`Fetching info for address: ${address} (last updated ${timeDiff / (60 * 1000)} minutes ago)`);

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

    // edge case: a tx makes 2 identical eth internal transfers
    // The to & from are both tracked accounts so we get these calls in the txHistory of both.
    // We do want to include these two identical transfers so we can't naively dedup
    // But we don't want a copy from both account's tx history so can't blindly push everything

    const oldTknCalls = JSON.parse(JSON.stringify(chainData.calls));
    for (const tx of tokenTxHistory) {
      const oldDups = oldTknCalls.filter(call =>
        tx.from === call.from &&
        tx.hash === call.hash &&
        tx.to === call.to &&
        formatEther(tx.value) === call.value,
      ).length;
      if (oldDups === 0) {
        chainData.calls.push({
          block: parseInt(tx.blockNumber.toString(), 10),
          contractAddress: tx.contractAddress,
          from: tx.from,
          hash: tx.hash,
          timestamp: (new Date((tx.timestamp || tx.timeStamp) * 1000)).toISOString(),
          to: tx.to,
          value: formatEther(tx.value),
        });
      } else {
        log.debug(`Skipping token call, we already have ${oldDups} for ${tx.hash}`);
        continue;
      }
    }

    const oldEthCalls = JSON.parse(JSON.stringify(chainData.calls));
    for (const tx of internalTxHistory) {
      const oldDups = oldEthCalls.filter(call =>
        tx.from === call.from &&
        tx.hash === call.hash &&
        tx.to === call.to &&
        formatEther(tx.value) === call.value,
      ).length;
      if (oldDups === 0) {
        chainData.calls.push({
          block: parseInt(tx.blockNumber.toString(), 10),
          contractAddress: AddressZero,
          from: tx.from,
          hash: tx.hash,
          timestamp: (new Date((tx.timestamp || tx.timeStamp) * 1000)).toISOString(),
          // Contracts creating contracts: if tx.to is empty then this is a contract creation call
          // We got this call from this address's history so it must be either the tx.to or tx.from
          to: ((tx.to === "" || tx.to === null) && tx.from !== address) ? address : tx.to,
          value: formatEther(tx.value),
        });
      } else {
        log.debug(`Skipping eth call, we already have ${oldDups} for ${tx.hash}`);
        continue;
      }
    }

    chainData.addresses[address] = new Date().toISOString();
    saveChainData(chainData);
    log.info(`📝 progress saved\n`);
  }

  log.info(`Fetching ${
    Object.values(chainData.transactions).filter(tx => !tx.logs).length
  } transaction receipts`);

  const getStatus = (receipt, tx): number =>
    // If post-byzantium, then the receipt already has a status, yay
    typeof receipt.status === "number"
      ? receipt.status
      // If pre-byzantium used less gas than the limit, it definitely didn't fail
      : !eq(toDecStr(tx.gasLimit.toString()), toDecStr(receipt.gasUsed.toString()))
      ? 1
      // If it used exactly 21000 gas, it's PROBABLY a simple transfer that succeeded
      : eq(toDecStr(tx.gasLimit.toString()), "21000")
      ? 1
      // Otherwise it PROBABLY failed
      : 0;

  // Scan all new transactions & fetch logs for any that don't have them yet
  for (const [hash, tx] of Object.entries(chainData.transactions).sort(
    (e1, e2) => e1[0] > e2[0] ? 1 : -1,
  )) {
    if (!tx.logs || typeof tx.status === "undefined" || tx.block < 4370000) {
      log.info(`💫 getting logs for tx ${hash}`);
      const receipt = await provider.getTransactionReceipt(tx.hash);
      tx.gasUsed = hexlify(receipt.gasUsed);
      tx.index = receipt.transactionIndex;
      tx.logs = receipt.logs.map(log => ({
        address: log.address,
        data: log.data,
        index: log.transactionLogIndex,
        topics: log.topics,
      }));
      // If a status field is proivided, awesome
      tx.status = getStatus(receipt, tx);
      log.info(`✅ got ${tx.logs.length} log${tx.logs.length > 1 ? "s" : ""}`);
      chainData.transactions[hash] = tx;
      saveChainData(chainData);
    }
  }

  // Loop through calls & get tx receipts for those too
  // bc we might need to ignore calls if the tx receipt says it was reverted..

  for (const call of chainData.calls.sort((c1, c2) => c1.hash > c2.hash ? 1 : -1)) {
    if (!chainData.transactions[call.hash] || call.block < 4370000) {
      log.info(`💫 getting tx data for call ${call.hash}`);
      const tx = await provider.getTransaction(call.hash);
      const receipt = await provider.getTransactionReceipt(tx.hash);
      chainData.transactions[tx.hash] = {
        block: tx.blockNumber,
        data: tx.data,
        from: tx.from,
        gasLimit: tx.gasLimit ? hexlify(tx.gasLimit) : undefined,
        gasPrice: tx.gasPrice ? hexlify(tx.gasPrice) : undefined,
        gasUsed: hexlify(receipt.gasUsed),
        hash: tx.hash,
        index: receipt.transactionIndex,
        logs: receipt.logs.map(log => ({
          address: log.address,
          data: log.data,
          index: log.transactionLogIndex,
          topics: log.topics,
        })),
        nonce: tx.nonce,
        status: getStatus(receipt, tx),
        timestamp: call.timestamp,
        to: tx.to,
        value: formatEther(tx.value),
      };
      saveChainData(chainData);
      log.info(`✅ got data with ${receipt.logs.length} log${receipt.logs.length > 1 ? "s" : ""}`);
    }
  }

  chainData.lastUpdated = (new Date()).toISOString();
  saveChainData(chainData);
  return chainData;
};
