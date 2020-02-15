/* global process */
import fs from "fs";
import { getDefaultProvider } from "ethers";
import { JsonRpcProvider } from "ethers/providers";
import { AddressData, ChainData, InputData } from "./types";

const emptyChainData: ChainData = {
  addresses: {},
  blockNumber: 0,
  transactions: {},
};

const emptyAddressData: AddressData = {
  nonce: 0,
};

const cacheFile = "./.chain-data.json";

const loadCache = (): ChainData => {
  try {
    return JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  } catch (e) {
    console.warn(e.message);
    if (e.message.startsWith("ENOENT: no such file or directory")) {
      return emptyChainData;
    }
    throw new Error(`Unable to load chainData cache, try deleting ${cacheFile} & try again`);
  }
};

const saveCache = (chainData: ChainData): void =>
  fs.writeFileSync(cacheFile, JSON.stringify(chainData, null, 2));

export const fetchChaindata = async (input: InputData): Promise<ChainData> => {
  let chainData = loadCache();
  let provider;
  if (process.env.ETH_PROVIDER) {
    console.log(`Using provider: ${process.env.ETH_PROVIDER}`);
    provider = new JsonRpcProvider(process.env.ETH_PROVIDER);
  } else {
    console.log(`Using default provider`);
    provider = getDefaultProvider("homestead");
  }

  chainData.blockNumber = await provider.getBlockNumber();
  console.log(`Latest block: ${chainData.blockNumber}`);

  for (const [address, label] of Object.entries(input.addresses)) {
    if (!label.startsWith("self")) { continue; }
    const addressData = chainData.addresses[address] || emptyAddressData;

    console.log(`Fetching info for ${label} address: ${address}`);

    chainData.addresses[address].nonce = await provider.getTransactionCount(address);

    chainData.addresses[address] = addressData;
    saveCache(chainData);
    break; // TODO: remove
  }

  return chainData;
};
