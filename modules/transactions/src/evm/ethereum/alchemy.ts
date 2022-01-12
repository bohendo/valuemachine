import { getAddress as getEvmAddress } from "@ethersproject/address";
import { hexlify } from "@ethersproject/bytes";
import { formatEther } from "@ethersproject/units";
import { Bytes32, Logger } from "@valuemachine/types";
import { dedup, getLogger, math } from "@valuemachine/utils";
import axios from "axios";

import { Assets, Guards } from "../../enums";
import { formatTraces, getEvmTransactionError, getStatus, toISOString } from "../utils";
import { EvmAddress, EvmFetcher, EvmTransaction } from "../types";

export const getAlchemyFetcher = ({
  providerUrl,
  logger,
}: {
  providerUrl: string,
  logger: Logger,
}): EvmFetcher => {
  const log = (logger || getLogger()).child?.({ name: "AlchemyFetcher" });

  if (!providerUrl) throw new Error(`Alchemy provider URL is required`);

  const metadata = {
    id: 1,
    name: Guards.Ethereum,
    feeAsset: Assets.ETH,
  };

  ////////////////////////////////////////
  // Internal Helper Functions

  const getAddress = (address: string): string => `${metadata.name}/${getEvmAddress(address)}`;

  const query = async (
    method: string,
    params: string[] | { [key: string]: any },
  ): Promise<any> => {
    const payload = { id: 137, jsonrpc: "2.0", method, params };
    const cleanUrl = providerUrl.replace(/\/[0-9a-zA-Z_]+$/, " ");
    const wget = async () => {
      log.debug(payload, `POST ${providerUrl}`);
      return await axios.post(providerUrl, payload, { timeout: 10000 }).catch(e => {
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
        log.warn(`Request timed out, retrying ${method} call w params ${JSON.stringify(params)}`);
        await new Promise(res => setTimeout(res, 1000)); // short pause
        res = await wget();
      } else if (msg.includes("rate limit") || msg.includes("429")) {
        log.warn(`We're rate limited, pausing then retrying ${method} call w params ${JSON.stringify(params)}`);
        await new Promise(res => setTimeout(res, 4000)); // long pause
        res = await wget();
      } else {
        log.error(payload, `POST ${cleanUrl}`);
        throw e;
      }
    }
    const result = res?.data?.result;
    if (typeof result !== "object") {
      throw new Error(`Failed to get a valid result from ${cleanUrl}`);
    }
    log.trace(result, `Got a valid result for ${method}`);
    return result;
  };

  // NOTE: We still need a way to find zero-value transactions so we can account for tx fees
  // Alchemy history is currently incomplete
  const fetchHistory = async (address: EvmAddress): Promise<Bytes32[]> => {
    const fetchAllTransfers = async (baseParams: any) => {
      const transfers = [];
      const res = await query("alchemy_getAssetTransfers", [baseParams]);
      transfers.push(...res.transfers);
      let pageKey = res.pageKey;
      while (pageKey) {
        log.debug(`We have another page of ${address} transfers keyed on ${pageKey}`);
        const res = await query("alchemy_getAssetTransfers", [{ ...baseParams, pageKey }]);
        transfers.push(...res.transfers);
        pageKey = res.pageKey;
      }
      return transfers;
    };
    const [incoming, outgoing] = await Promise.all([
      fetchAllTransfers({ fromBlock: "0x00", toAddress: address }),
      fetchAllTransfers({ fromBlock: "0x00", fromAddress: address }),
    ]);
    return dedup([
      ...incoming.map(tx => tx.hash),
      ...outgoing.map(tx => tx.hash),
    ].filter(hash => !!hash).sort());
  };

  const fetchTransaction = async (txHash: Bytes32): Promise<EvmTransaction> => {
    const [tx, receipt, traces] = await Promise.all([
      query("eth_getTransactionByHash", [txHash]),
      query("eth_getTransactionReceipt", [txHash]),
      query("trace_transaction", [txHash]),
    ]);
    const timestamp = toISOString(
      (await query("eth_getBlockByNumber", [receipt.blockNumber, false])).timestamp
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
      transfers: formatTraces(traces, metadata),
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
