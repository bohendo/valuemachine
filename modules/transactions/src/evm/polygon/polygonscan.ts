import { isAddress as isEvmAddress, getAddress as getEvmAddress } from "@ethersproject/address";
import { hexlify } from "@ethersproject/bytes";
import { formatEther } from "@ethersproject/units";
import { Bytes32, Logger } from "@valuemachine/types";
import { dedup, getLogger, math } from "@valuemachine/utils";
import axios from "axios";

import { Assets, Guards } from "../../enums";
import { getEvmTransactionError, getStatus, toISOString } from "../utils";
import { EvmAddress, EvmFetcher, EvmMetadata, EvmTransaction } from "../types";

export const getPolygonscanFetcher = ({
  apiKey,
  logger,
}: {
  apiKey: string,
  logger: Logger,
}): EvmFetcher => {
  const log = (logger || getLogger()).child?.({ name: "PolygonscanFetcher" });

  if (!apiKey) throw new Error(`Polygonscan api key is required`);

  const metadata = {
    id: 137,
    name: Guards.Polygon,
    feeAsset: Assets.MATIC,
  } as EvmMetadata;

  // Mapping of blockNumber (IntString): timestamp (DateTimeString)
  // Bc Polygonscan doesn't reliably return timestamps while fetching txns by hash
  const timestampCache = {} as { [blockNumber: string]: string };

  ////////////////////////////////////////
  // Internal Helper Functions

  const tmpTxlistinternalErrorHandler = (target: string) => (error: any): any[] => {
    // Temporary error handler while polygonscan is broken
    if (
      error.message === "Error! Missing Or invalid Action name" ||
      error.message.startsWith("Failed to get a valid result")
    ) {
      log.warn(`Treating ${target} txlistinternal error as an empty result: ${error.message}`);
      return [];
    }
    throw error;
  };

  const getAddress = (address: string): string => `${metadata.name}/${getEvmAddress(address)}`;

  const query = async (
    module: string = "account",
    action: string = "txlistinternal",
    target: EvmAddress | Bytes32,
  ): Promise<any> => {
    const targetType = isEvmAddress(target) ? "address"
      : target.length === 66 ? "txhash"
      : "boolean=false&tag";
    const url = `https://api.polygonscan.com/api?` +
      `module=${module}&` +
      `action=${action}&` +
      `${targetType}=${target}&` +
      `apikey=${apiKey}&sort=asc`;
    const cleanUrl = url.replace(/\??(api)?key=[^&]+&?/, "").replace(/&sort=asc$/, "");
    const wget = async () => {
      log.debug(`GET ${cleanUrl}`);
      return await axios.get(url, { timeout: 10000 }).catch(e => {
        // log.error(e.message);
        if (typeof e?.response === "string") log.error(e.response);
        throw new Error(e);
      });
    };
    let res;
    try {
      res = await wget();
      if (typeof res === "string") throw new Error(res);
      if (typeof res?.data?.result === "string") throw new Error(res?.data?.result);
    } catch (e) {
      const msg = e.message.toLowerCase();
      if (msg.includes("timeout") || msg.includes("eai_again") || msg.includes("econnreset")) {
        log.warn(`Request timed out, retrying to get ${action} for ${target}`);
        await new Promise(res => setTimeout(res, 1000)); // short pause
        res = await wget();
      } else if (msg.includes("rate limit") || msg.includes("429")) {
        log.warn(`We're rate limited, pausing then retrying to get ${action} for ${target}`);
        await new Promise(res => setTimeout(res, 4000)); // long pause
        res = await wget();
      } else {
        log.error(`GET ${cleanUrl}`);
        throw e;
      }
    }
    const result = res?.data?.result;
    if (typeof result !== "object") {
      throw new Error(`Failed to get a valid result from ${cleanUrl}`);
    }
    return result;
  };

  const fetchHistory = async (address: EvmAddress): Promise<Bytes32[]> => {
    const [simple, internal, token, nft] = await Promise.all([
      query("account", "txlist", address),
      query("account", "txlistinternal", address).catch(tmpTxlistinternalErrorHandler("address")),
      query("account", "tokentx", address),
      query("account", "tokennfttx", address),
    ]);
    // Polygonscan doesn't provide timestamps while fetching tx info by hash
    // Save timestamps while fetching account histories so we can reuse them later
    [...simple, ...internal, ...token, ...nft].forEach(tx => {
      if (tx.blockNumber && (tx.timestamp || tx.timeStamp)) {
        const blockNumber = math.toBN(tx.blockNumber).toString();
        const timestamp = toISOString(tx.timestamp || tx.timeStamp);
        timestampCache[blockNumber] = timestamp;
        log.debug(`Added new timestamp cache entry for ${blockNumber}: ${timestamp}`);
      }
    });
    return dedup([
      ...simple.map(tx => tx.hash),
      ...internal.map(tx => tx.hash),
      ...token.map(tx => tx.hash),
      ...nft.map(tx => tx.hash),
    ].filter(hash => !!hash).sort());
  };

  const fetchTransaction = async (txHash: Bytes32): Promise<EvmTransaction> => {
    const [tx, receipt, transfers] = await Promise.all([
      query("proxy", "eth_getTransactionByHash", txHash),
      query("proxy", "eth_getTransactionReceipt", txHash),
      query("account", "txlistinternal", txHash).catch(tmpTxlistinternalErrorHandler("txHash")),
    ]);
    const timestamp = timestampCache[math.toBN(tx.blockNumber).toString()] || toISOString(
      (await query("proxy", "eth_getBlockByNumber", receipt.blockNumber)).timestamp
    );
    const transaction = {
      from: getAddress(tx.from),
      gasPrice: math.toBN(tx.effectiveGasPrice || tx.gasPrice).toString(),
      gasUsed: math.toBN(receipt.gasUsed).toString(),
      hash: hexlify(tx.hash),
      logs: receipt.logs.map(evt => ({
        address: getAddress(evt.address),
        index: math.toNum(evt.logIndex),
        topics: evt.topics.map(hexlify),
        data: hexlify(evt.data || "0x"),
      })),
      nonce: math.toNum(tx.nonce),
      status: getStatus(tx, receipt),
      timestamp,
      transfers: transfers.map(transfer => ({
        to: transfer.to ? getAddress(transfer.to) : null,
        from: getAddress(transfer.from),
        value: formatEther(transfer.value),
      })),
      to: tx.to ? getAddress(tx.to) : null,
      value: formatEther(tx.value),
    };
    const txError = getEvmTransactionError(transaction);
    if (txError) {
      throw new Error(txError);
    }
    return transaction;
  };

  return {
    fetchHistory,
    fetchTransaction,
  };

};
