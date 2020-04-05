import axios from "axios";
import { Contract } from "ethers";
import { AddressZero } from "ethers/constants";
import { EtherscanProvider } from "ethers/providers";
import { BigNumber, BigNumberish, bigNumberify, formatEther, hexlify, toUtf8String } from "ethers/utils";

import { getTokenAbi } from "./abi";
import { env } from "./env";
import { loadChainData, saveChainData } from "./cache";
import { AddressBook, ChainData, HexObject, HexString } from "./types";
import { Logger } from "./utils";

const toBN = (n: BigNumberish | HexObject): BigNumber =>
  bigNumberify((n && (n as HexObject)._hex) ? (n as HexObject)._hex : n.toString());

const toNum = (num: BigNumber | number): number =>
  parseInt(toBN(num.toString()).toString(), 10);

const toStr = (str: HexString | string): string =>
  str.startsWith("0x") ? toUtf8String(str).replace(/\u0000/g, "") : str;

export const getChainData = async (addressBook: AddressBook): Promise<ChainData> => {
  const log = new Logger("ChainData", env.logLevel);
  const chainData = loadChainData();
  const addresses = addressBook.addresses.filter(addressBook.isSelf).sort();
  const supportedTokens = addressBook.addresses.filter(addressBook.isToken).sort();

  if (!env.etherscanKey) {
    throw new Error("To track eth activity, you must provide an etherscanKey");
  }
  const provider = new EtherscanProvider("homestead", env.etherscanKey);

  try {
    log.info(`💫 verifying ethereum provider`);
    const network = await provider.getNetwork();
    log.info(`✅ successfully connected to network: ${JSON.stringify(network)}`);
  } catch (e) {
    if (e.message.includes("invalid response - 0")) {
      log.warn(`Network error, couldn't fetch chain data (Are you offline?)`);
      return chainData;
    } else {
      throw e;
    }
  }

  ////////////////////////////////////////
  // Step 1: Get token data

  for (const tokenAddress of supportedTokens) {
    if (!chainData.tokens.map(token => token.address).includes(tokenAddress)) {
      log.info(`Fetching info for token ${tokenAddress}`);

      const token = new Contract(tokenAddress, getTokenAbi(tokenAddress), provider);
      const tokenData = {
        address: tokenAddress,
        decimals: toNum((await token.functions.decimals()) || 18),
        name: toStr((await token.functions.name()) || "Unknown"),
        symbol: toStr((await token.functions.symbol()) || "???"),
      };
      chainData.tokens.push(tokenData);
      saveChainData(chainData);
    } else {
      log.info(`Info for token ${tokenAddress} is up to date.`);
    }
  }

  saveChainData(chainData);
  log.info(`Token info is up to date`);

  ////////////////////////////////////////
  // Step 2: Get account history

  for (const address of addresses) {
    // Find the most recent tx timestamp that involved any interaction w this address
    const lastSeen = chainData.transactions
      .filter(
        tx => tx.to === address ||
        tx.from === address || 
        (
          tx.logs &&
          tx.logs
            .map(log => [log.address].concat(log.topics))
            .some(logData => logData.includes(address.replace(/^0x/, "")))
        ),
      )
      .map(tx => tx.timestamp)
      .sort((ds1, ds2) => new Date(ds1).getTime() - new Date(ds2).getTime())[0];
    const lastUpdated = chainData.addresses[address];
    const timeDiff = lastUpdated ? Date.now() - new Date(lastUpdated).getTime() : Date.now();

    // Accounts are considered retired if no activity seen in the previous year
    if (lastUpdated && new Date(lastSeen).getTime() > 365 * 24 * 60 * 50 * 1000) {
      log.info(`Retired address ${address} data was already fetched ${new Date(timeDiff).toISOString()} ago`);
      continue;
    }

    // Re-fetch tx history for active addresses w no activity detected in the last 24 hours
    if (timeDiff < 6 * 60 * 60 * 1000) {
      log.info(`Active address ${address} was updated ${timeDiff / (60 * 1000)} minutes ago`);
      continue;
    }
    log.info(`Fetching info for address: ${address} (last updated ${timeDiff / (60 * 1000)} minutes ago)`);

    log.info(`💫 getting externaltxHistory..`);
    const externaltxHistory = await provider.getHistory(address);
    log.info(`✅ externaltxHistory: ${externaltxHistory.length} logs`);

    for (const tx of externaltxHistory) {
      if (tx && tx.hash && !chainData.transactions.find(existing => existing.hash === tx.hash)) {
        chainData.transactions.push({
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
        });
      }
    }

    log.info(`💫 getting internalTxHistory..`);
    const internalTxHistory = (await axios.get(
      `https://api.etherscan.io/api?module=account&action=txlistinternal&address=${
        address
      }&apikey=${
        env.etherscanKey
      }&sort=asc`,
    )).data.result;
    log.info(`✅ internalTxHistory: ${internalTxHistory.length} logs`);

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

    log.info(`💫 getting tokenTxHistory..`);
    const tokenTxHistory = (await axios.get(
      `https://api.etherscan.io/api?module=account&action=tokentx&address=${
        address
      }&apikey=${
        env.etherscanKey
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

    chainData.addresses[address] = new Date().toISOString();
    saveChainData(chainData);
    log.info(`📝 progress saved\n`);
  }

  chainData.calls = chainData.calls.sort((c1, c2) => c1.hash > c2.hash ? 1 : -1);
  chainData.transactions = chainData.transactions.sort((tx1, tx2) => tx1.hash > tx2.hash ? 1 : -1);
  saveChainData(chainData);

  ////////////////////////////////////////
  // Step 3: Get receipts for all transactions & calls

  log.info(`Fetching ${chainData.transactions.filter(tx => !tx.logs).length} transaction receipts`);

  const getStatus = (receipt, tx): number =>
    // If post-byzantium, then the receipt already has a status, yay
    typeof receipt.status === "number"
      ? receipt.status
      // If pre-byzantium tx used less gas than the limit, it definitely didn't fail
      : !toBN(tx.gasLimit).eq(toBN(receipt.gasUsed))
      ? 1
      // If it used exactly 21000 gas, it's PROBABLY a simple transfer that succeeded
      : toBN(tx.gasLimit).eq(toBN("21000"))
      ? 1
      // Otherwise it PROBABLY failed
      : 0;

  // Scan all new transactions & fetch logs for any that don't have them yet
  for (const tx of chainData.transactions) {
    if (!tx.logs) {
      const index = chainData.transactions.findIndex(t => t.hash === tx.hash);
      log.info(`💫 getting logs for tx ${index}/${chainData.transactions.length} ${tx.hash}`);
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
      chainData.transactions.splice(index, 1, tx);
      saveChainData(chainData);
    }
  }

  // Loop through calls & get tx receipts for those too
  // bc we might need to ignore calls if the tx receipt says it was reverted..

  for (const call of chainData.calls) {
    const index = chainData.transactions.findIndex(tx => tx.hash === call.hash);
    if (index !== -1 && chainData.transactions[index].logs) {
      continue;
    }
    log.info(`💫 getting tx data for call ${call.hash}`);
    const tx = await provider.getTransaction(call.hash);
    const receipt = await provider.getTransactionReceipt(call.hash);
    log.info(`✅ got data with ${receipt.logs.length} log${receipt.logs.length > 1 ? "s" : ""}`);
    const transaction = {
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
    if (index === -1) {
      chainData.transactions.push(transaction); // insert element at end
    } else {
      chainData.transactions.splice(index, 1, transaction); // replace 1 element at index
    }
    saveChainData(chainData);
  }

  chainData.transactions = chainData.transactions.sort((tx1, tx2) => tx1.hash > tx2.hash ? 1 : -1);
  saveChainData(chainData);
  return chainData;
};
