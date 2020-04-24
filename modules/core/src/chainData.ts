import { Address, ChainData, HexObject, HexString } from "@finances/types";
import axios from "axios";
import { Contract } from "ethers";
import { AddressZero } from "ethers/constants";
import { EtherscanProvider } from "ethers/providers";
import {
  BigNumber,
  bigNumberify,
  BigNumberish,
  formatEther,
  hexlify,
  toUtf8String,
} from "ethers/utils";

import { getTokenAbi } from "./abi";
import { ILogger } from "./types";
import { ContextLogger } from "./utils";

export const getChainData = async (
  userAddresses: Address[],
  tokenAddresses: Address[],
  cache: any,
  etherscanKey: string,
  logger: ILogger = console,
): Promise<ChainData> => {
  const log = new ContextLogger("GetChainData", logger);
  const chainData = cache.loadChainData();

  const hour = 60 * 60 * 1000;
  const month = 30 * 24 * hour;

  const toBN = (n: BigNumberish | HexObject): BigNumber =>
    bigNumberify((n && (n as HexObject)._hex) ? (n as HexObject)._hex : n.toString());

  const toNum = (num: BigNumber | number): number =>
    parseInt(toBN(num.toString()).toString(), 10);

  const toStr = (str: HexString | string): string =>
    str.startsWith("0x") ? toUtf8String(str).replace(/\u0000/g, "") : str;

  const logProg = (list: any[], elem: any): string =>
    `${list.indexOf(elem)}/${list.length}`;

  const chrono = (d1: any, d2: any): number =>
    new Date(d1.timestamp || d1).getTime() - new Date(d2.timestamp || d2).getTime();

  if (!etherscanKey) {
    throw new Error("To track eth activity, you must provide an etherscanKey");
  }
  const provider = new EtherscanProvider("homestead", etherscanKey);

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

  const fetchHistory = async (method: string, address: Address): Promise<any[]> =>
    (await axios.get(`https://api.etherscan.io/api?module=account&action=${method}&address=${
      address
    }&apikey=${
      etherscanKey
    }&sort=asc`)).data.result;


  ////////////////////////////////////////
  // Step 1: Get token data

  const supportedTokens = tokenAddresses.filter(
    address => !Object.keys(chainData.tokens).includes(address),
  );

  log.info(`Step 1: Fetching info for ${supportedTokens.length} supported tokens`);
  for (const tokenAddress of supportedTokens) {
    log.info(`Fetching info for token ${logProg(supportedTokens, tokenAddress)}: ${tokenAddress}`);
    const token = new Contract(tokenAddress, getTokenAbi(tokenAddress), provider);
    chainData.tokens[tokenAddress.toLowerCase()] = {
      decimals: toNum((await token.functions.decimals()) || 18),
      name: toStr((await token.functions.name()) || "Unknown"),
      symbol: toStr((await token.functions.symbol()) || "???"),
    };
    cache.saveChainData(chainData);
  }

  cache.saveChainData(chainData);

  ////////////////////////////////////////
  // Step 2: Get account history

  const addresses = userAddresses.filter(address => {
    if (!chainData.addresses[address]) {
      return true;
    }

    const lastAction = chainData.transactions
      .filter(tx =>
        tx.to === address ||
        tx.from === address ||
        (
          tx.logs &&
          tx.logs
            .map(log => log.topics.concat(log.address).concat(log.data))
            .some(logData => logData.some(
              dataField => dataField.includes(address.replace(/^0x/, "")),
            ))
        ),
      )
      .map(tx => tx.timestamp)
      .concat(
        chainData.calls
          .filter(call => call.to === address || call.from === address)
          .map(tx => tx.timestamp),
      )
      .sort(chrono).reverse()[0];

    if (!lastAction) {
      log.debug(`No activity detected for address ${address}`);
      return true;
    }

    // Don't sync any addresses w no recent activity if they have been synced before
    if (Date.now() - new Date(lastAction).getTime() > 6* month) {
      log.debug(`Skipping retired (${lastAction}) address ${address} because data was already fetched`);
      return false;
    }

    // Don't sync any active addresses if they've been synced recently
    if (Date.now() - new Date(chainData.addresses[address]).getTime() < 12 * hour) {
      log.debug(`Skipping active (${lastAction}) address ${address} because it was recently synced.`);
      return false;
    }
    return true;
  });

  log.info(`Step 2: Fetching tx history for ${addresses.length} addresses`);
  for (const address of addresses) {
    // Find the most recent tx timestamp that involved any interaction w this address
    log.info(`Fetching info for address ${logProg(addresses, address)}: ${address}`);

    log.info(`💫 getting externaltxHistory..`);
    for (const tx of (await provider.getHistory(address))) {
      if (tx && tx.hash && !chainData.transactions.find(existing => existing.hash === tx.hash)) {
        chainData.transactions.push({
          block: tx.blockNumber,
          data: tx.data,
          from: tx.from.toLowerCase(),
          gasLimit: tx.gasLimit ? hexlify(tx.gasLimit) : undefined,
          gasPrice: tx.gasPrice ? hexlify(tx.gasPrice) : undefined,
          hash: tx.hash,
          nonce: tx.nonce,
          timestamp: (new Date(tx.timestamp * 1000)).toISOString(),
          to: tx.to ? tx.to.toLowerCase() : null,
          value: formatEther(tx.value),
        });
      }
    }

    // Beware of edge case: a tx makes 2 identical eth internal transfers and
    // the to & from are both tracked accounts so we get these calls in the txHistory of both.
    // We do want to include these two identical transfers so we can't naively dedup
    // But we don't want a copy from both account's tx history so can't blindly push everything
    const getDups = (oldList: any[], newElem: any): number =>
      oldList.filter(oldElem =>
        newElem.from.toLowerCase() === oldElem.from &&
        newElem.hash === oldElem.hash &&
        newElem.to.toLowerCase() === oldElem.to &&
        formatEther(newElem.value) === oldElem.value,
      ).length;

    log.info(`💫 getting internalTxHistory..`);
    const oldEthCalls = JSON.parse(JSON.stringify(chainData.calls));
    for (const call of (await fetchHistory("txlistinternal", address))) {
      if (getDups(oldEthCalls, call) > 0) {
        log.debug(`Skipping eth call, dup detected`);
        continue;
      }
      chainData.calls.push({
        block: parseInt(call.blockNumber.toString(), 10),
        contractAddress: AddressZero,
        from: call.from.toLowerCase(),
        hash: call.hash,
        timestamp: (new Date((call.timestamp || call.timeStamp) * 1000)).toISOString(),
        // Contracts creating contracts: if call.to is empty then this is a contract creation call
        // We got call from this address's history so it must be either the call.to or call.from
        to: ((call.to === "" || call.to === null) && call.from !== address)
          ? address
          : call.to ? call.to.toLowerCase() : null,
        value: formatEther(call.value),
      });
    }

    log.info(`💫 getting tokenTxHistory..`);
    const oldTknCalls = JSON.parse(JSON.stringify(chainData.calls));
    for (const call of (await fetchHistory("tokentx", address))) {
      if (!tokenAddresses.includes(call.contractAddress)) {
        log.debug(`Skipping token call, unsupported token: ${call.contractAddress}`);
        continue;
      }
      if (getDups(oldTknCalls, call) > 0) {
        log.debug(`Skipping token call, dup detected`);
        continue;
      }
      chainData.calls.push({
        block: parseInt(call.blockNumber.toString(), 10),
        contractAddress: call.contractAddress.toLowerCase(),
        from: call.from.toLowerCase(),
        hash: call.hash,
        timestamp: (new Date((call.timestamp || call.timeStamp) * 1000)).toISOString(),
        to: call.to.toLowerCase(),
        value: formatEther(call.value),
      });
    }

    chainData.addresses[address] = new Date().toISOString();
    cache.saveChainData(chainData);
    log.info(`📝 progress saved`);
  }

  cache.saveChainData(chainData);

  ////////////////////////////////////////
  // Step 3: Get transaction data for all calls
  // bc we might need to ignore calls if the tx receipt says it was reverted..

  const callsWithoutTx = chainData.calls.filter(
    call => !chainData.transactions.some(tx => tx.hash === call.hash),
  );
  log.info(`Step 3: Fetching transaction data for ${callsWithoutTx.length} calls`);

  for (const call of callsWithoutTx) {
    const index = chainData.transactions.findIndex(tx => tx.hash === call.hash);
    if (index !== -1) {
      continue;
    }
    log.info(`💫 getting tx data for call ${logProg(callsWithoutTx, call)} ${call.hash}`);
    const tx = await provider.getTransaction(call.hash);
    log.info(`✅ got transaction`);
    const transaction = {
      block: tx.blockNumber,
      data: tx.data,
      from: tx.from.toLowerCase(),
      gasLimit: tx.gasLimit ? hexlify(tx.gasLimit) : undefined,
      gasPrice: tx.gasPrice ? hexlify(tx.gasPrice) : undefined,
      hash: tx.hash,
      nonce: tx.nonce,
      timestamp: call.timestamp,
      to: tx.to ? tx.to.toLowerCase() : null,
      value: formatEther(tx.value),
    };
    if (index === -1) {
      chainData.transactions.push(transaction); // insert element at end
    } else {
      chainData.transactions.splice(index, 1, transaction); // replace 1 element at index
    }
    cache.saveChainData(chainData);
  }

  ////////////////////////////////////////
  // Step 4: Get receipts for all transactions

  log.info(`Step 4: Fetching ${chainData.transactions.filter(tx => !tx.logs).length} transaction receipts`);

  // Scan all new transactions & fetch logs for any that don't have them yet
  for (const tx of chainData.transactions) {
    if (!tx.logs) {
      const index = chainData.transactions.findIndex(t => t.hash === tx.hash);
      log.info(`💫 getting logs for tx ${index}/${chainData.transactions.length} ${tx.hash}`);
      const receipt = await provider.getTransactionReceipt(tx.hash);
      tx.gasUsed = hexlify(receipt.gasUsed);
      tx.index = receipt.transactionIndex;
      tx.logs = receipt.logs.map(log => ({
        address: log.address.toLowerCase(),
        data: log.data,
        index: log.transactionLogIndex,
        topics: log.topics,
      }));
      // If a status field is proivided, awesome
      tx.status =
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
      log.info(`✅ got ${tx.logs.length} log${tx.logs.length > 1 ? "s" : ""}`);
      chainData.transactions.splice(index, 1, tx);
      cache.saveChainData(chainData);
    }
  }

  chainData.calls = chainData.calls.sort(chrono);
  chainData.transactions = chainData.transactions.sort(chrono);
  cache.saveChainData(chainData);
  return chainData;
};
