import { getAddress as getEvmAddress } from "@ethersproject/address";
import { formatEther } from "@ethersproject/units";
import { hexlify } from "@ethersproject/bytes";
import {
  Bytes32,
  EvmAddress,
  EvmMetadata,
  Logger,
} from "@valuemachine/types";
import {
  dedup,
  getLogger,
  math,
} from "@valuemachine/utils";
import axios from "axios";

import { EvmFetcher } from "../types";
import { Assets, Guards } from "../../enums";

export const getCovalentFetcher = ({
  apiKey,
  logger,
}: {
  apiKey: string,
  logger: Logger,
}): EvmFetcher => {
  const log = (logger || getLogger()).child?.({ module: "CovalentFetcher" });

  if (!apiKey) throw new Error(`Covalent api key is required`);

  const metadata = {
    id: 137,
    name: Guards.Polygon,
    feeAsset: Assets.MATIC,
  } as EvmMetadata;

  ////////////////////////////////////////
  // Internal Heleprs

  const numify = (val: number | string): number => math.toBN(val).toNumber();
  const stringify = (val: number | string): string => numify(val).toString();

  // CAIP-10
  const getAddress = (address: string): string => `${metadata.name}/${getEvmAddress(address)}`;

  const formatCovalentTx = rawTx => ({
    // block: rawTx.block_height,
    // data: "0x", // not available?
    // gasLimit: hexlify(rawTx.gas_offered),
    // index: rawTx.tx_offset,
    from: getAddress(rawTx.from_address),
    gasPrice: stringify(rawTx.gas_price),
    gasUsed: stringify(rawTx.gas_spent),
    hash: hexlify(rawTx.tx_hash),
    logs: rawTx.log_events.map(evt => ({
      address: getAddress(evt.sender_address),
      index: evt.log_offset,
      topics: evt.raw_log_topics.map(hexlify),
      data: hexlify(evt.raw_log_data || "0x"),
    })),
    nonce: 0, // We need this to calculate the addresses of newly created contracts
    status: rawTx.successful ? 1 : 0,
    timestamp: rawTx.block_signed_at,
    transfers: [], // not available, get from etherscan
    to: rawTx.to_address ? getAddress(rawTx.to_address) : null,
    value: formatEther(rawTx.value),
  });

  const covalentUrl = "https://api.covalenthq.com/v1";
  const queryCovalent = async (path: string, query?: any): Promise<any> => {
    const url = `${covalentUrl}/${path}/?${
      Object.entries(query || {}).reduce((querystring, entry) => {
        querystring += `${entry[0]}=${entry[1]}&`;
        return querystring;
      }, "")
    }key=${apiKey}`;
    log.info(`GET ${url}`);
    let res;
    try {
      res = await axios(url);
    } catch (e) {
      log.warn(`Axios error: ${e.message}`);
      return;
    }
    if (res.status !== 200) {
      log.warn(`Unsuccessful status: ${res.status}`);
      return;
    }
    if (res.data.error) {
      log.warn(`Covalent error: ${res.data.error_message}`);
      return;
    }
    return res.data.data;
  };

  const fetchHistory = async (address: EvmAddress): Promise<Bytes32[]> => {
    let data = await queryCovalent(`${metadata.id}/address/${address}/transactions_v2`);
    const items = data?.items;
    while (items && data.pagination.has_more) {
      data = await queryCovalent(`${metadata.id}/address/${address}/transactions_v2`, {
        ["page-number"]: data.pagination.page_number + 1,
      });
      items.push(...data.items);
    }
    return dedup(items?.map(item => item.tx_hash).sort() || []);
  };

  const fetchTransaction = async (txHash: Bytes32): Promise<any> => {
    const data = await queryCovalent(`${metadata.id}/transaction_v2/${txHash}`);
    return formatCovalentTx(data?.items?.[0]);
  };

  return {
    fetchHistory,
    fetchTransaction,
  };
  
};
