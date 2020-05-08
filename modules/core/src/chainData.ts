import {
  Address,
  ChainData,
  ChainDataJson,
  HexString,
  Logger,
  Store,
  StoreKeys,
  TokenData,
} from "@finances/types";
import { ContextLogger } from "@finances/utils";
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
import { getEthTransactionError } from "./verify";

export const getChainData = (
  etherscanKey: string,
  store: Store,
  logger: Logger = console,
): ChainData => {
  const log = new ContextLogger("GetChainData", logger);
  const json = store.load(StoreKeys.ChainData);

  const hour = 60 * 60 * 1000;
  const month = 30 * 24 * hour;

  const toBN = (n: BigNumberish | { _hex: HexString }): BigNumber =>
    bigNumberify(
      (n && (n as { _hex: HexString })._hex)
        ? (n as { _hex: HexString })._hex
        : n.toString(),
    );

  const toNum = (num: BigNumber | number): number =>
    parseInt(toBN(num.toString()).toString(), 10);

  const toStr = (str: HexString | string): string =>
    str.startsWith("0x") ? toUtf8String(str).replace(/\u0000/g, "") : str;

  const logProg = (list: any[], elem: any): string =>
    `${list.indexOf(elem)}/${list.length}`;

  const chrono = (d1: any, d2: any): number =>
    new Date(d1.timestamp || d1).getTime() - new Date(d2.timestamp || d2).getTime();

  const fetchHistory = async (action: string, address: Address): Promise<any[]> =>
    (await axios.get(
      `https://api.etherscan.io/api?module=account&` +
      `action=${action}&` +
      `address=${address}&` +
      `apikey=${etherscanKey}&sort=asc`,
    )).data.result;

  if (!etherscanKey) {
    throw new Error("To track eth activity, you must provide an etherscanKey");
  }
  const provider = new EtherscanProvider("homestead", etherscanKey);

  ////////////////////////////////////////
  // Exported Methods

  const getAddressHistory = (...addresses: Address[]): ChainDataJson => {
    const include = (tx: { hash: HexString }): boolean => addresses.some(
        address => json.addresses[address].includes(tx.hash),
      );
    const summary = {};
    Object.keys(json.addresses).forEach(
      address => { if (addresses.includes(address)) { summary[address] = json[address]; } },
    );
    return JSON.parse(JSON.stringify({
      addresses: summary,
      transactions: json.transactions.filter(include),
      calls: json.calls.filter(include),
      tokens: json.tokens,
    }));
  };

  const getTokenData =  (token: Address): TokenData => {
    return JSON.parse(JSON.stringify(json.tokens[token]));
  };

  const syncTokenData = async (...tokens: Address[]): Promise<void> => {
    log.info(`Fetching info for ${tokens.length} supported tokens`);
    for (const tokenAddress of tokens) {
      if (json.tokens[tokenAddress] && typeof json.tokens[tokenAddress].decimals === "number") {
        log.debug(`Info for token ${logProg(tokens, tokenAddress)} is up to date: ${tokenAddress}`);
        continue;
      }
      log.info(`Fetching info for token ${logProg(tokens, tokenAddress)}: ${tokenAddress}`);
      const token = new Contract(tokenAddress, getTokenAbi(tokenAddress), provider);
      json.tokens[tokenAddress.toLowerCase()] = {
        decimals: toNum((await token.functions.decimals()) || 18),
        name: toStr((await token.functions.name()) || "Unknown"),
        symbol: toStr((await token.functions.symbol()) || "???"),
      };
      store.save(StoreKeys.ChainData, json);
    }
  };

  const syncAddressHistory = async (...userAddresses: Address[]): Promise<void> => {

    const addresses = userAddresses.filter(address => {
      if (!json.addresses[address]) {
        return true;
      }

      const lastAction = json.transactions
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
          json.calls
            .filter(call => call.to === address || call.from === address)
            .map(tx => tx.timestamp),
        )
        .sort(chrono).reverse()[0];

      if (!lastAction) {
        log.debug(`No activity detected for address ${address}`);
        return true;
      }

      // Don't sync any addresses w no recent activity if they have been synced before
      if (Date.now() - new Date(lastAction).getTime() > 6 * month) {
        log.debug(`Skipping retired (${lastAction}) address ${address} because data was already fetched`);
        return false;
      }

      return true;
    });

    log.info(`Fetching tx history for ${addresses.length} addresses`);
    for (const address of addresses) {
      // Find the most recent tx timestamp that involved any interaction w this address
      log.info(`Fetching info for address ${logProg(addresses, address)}: ${address}`);

      log.info(`💫 getting externaltxHistory..`);
      const txHistory = await provider.getHistory(address);
      for (const tx of txHistory) {
        if (tx && tx.hash && !json.transactions.find(existing => existing.hash === tx.hash)) {
          json.transactions.push({
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
      const oldEthCalls = JSON.parse(JSON.stringify(json.calls));
      const ethCalls = await fetchHistory("txlistinternal", address);
      for (const call of ethCalls) {
        if (getDups(oldEthCalls, call) > 0) {
          log.debug(`Skipping eth call, dup detected`);
          continue;
        }
        json.calls.push({
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
      const oldTknCalls = JSON.parse(JSON.stringify(json.calls));
      const tknCalls = await fetchHistory("tokentx", address);
      for (const call of tknCalls) {
        if (!Object.keys(json.tokens).includes(call.contractAddress)) {
          log.debug(`Skipping token call, unsupported token: ${call.contractAddress}`);
          continue;
        }
        if (getDups(oldTknCalls, call) > 0) {
          log.debug(`Skipping token call, dup detected`);
          continue;
        }
        json.calls.push({
          block: parseInt(call.blockNumber.toString(), 10),
          contractAddress: call.contractAddress.toLowerCase(),
          from: call.from.toLowerCase(),
          hash: call.hash,
          timestamp: (new Date((call.timestamp || call.timeStamp) * 1000)).toISOString(),
          to: call.to.toLowerCase(),
          value: formatEther(call.value),
        });
      }

      json.addresses[address] = Array.from(new Set([]
        .concat(txHistory, ethCalls, tknCalls)
        .map(tx => tx.hash)
        .filter(hash => !!hash),
      ));

      store.save(StoreKeys.ChainData, json);
      log.info(`📝 progress saved`);
    }

    ////////////////////////////////////////
    // Step 3: Get transaction data for all calls
    // bc we might need to ignore calls if the tx receipt says it was reverted..

    const callsWithoutTx = json.calls.filter(
      call => !json.transactions.some(tx => tx.hash === call.hash),
    );
    log.info(`Fetching transaction data for ${callsWithoutTx.length} calls`);

    for (const call of callsWithoutTx) {
      const index = json.transactions.findIndex(tx => tx.hash === call.hash);
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
        json.transactions.push(transaction); // insert element at end
      } else {
        json.transactions.splice(index, 1, transaction); // replace 1 element at index
      }
      store.save(StoreKeys.ChainData, json);
    }

    ////////////////////////////////////////
    // Step 4: Get receipts for all transactions

    log.info(`Fetching ${json.transactions.filter(tx => !tx.logs).length} transaction receipts`);

    // Scan all new transactions & fetch logs for any that don't have them yet
    for (const tx of json.transactions) {
      if (!tx.logs) {
        const index = json.transactions.findIndex(t => t.hash === tx.hash);
        log.info(`💫 getting logs for tx ${index}/${json.transactions.length} ${tx.hash}`);
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
        json.transactions.splice(index, 1, tx);
        store.save(StoreKeys.ChainData, json);
      }
    }

    json.calls = json.calls.sort(chrono);
    json.transactions = json.transactions.sort(chrono);
    json.transactions.forEach(tx => {
      const error = getEthTransactionError(tx);
      if (error) {
        throw new Error(error);
      }
    });
    store.save(StoreKeys.ChainData, json);
  };

  return {
    getAddressHistory,
    getTokenData,
    json,
    syncAddressHistory,
    syncTokenData,
  };
};
