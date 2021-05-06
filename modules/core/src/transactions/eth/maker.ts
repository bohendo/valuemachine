import {
  AddressBook,
  AddressBookJson,
  AddressCategories,
  ChainData,
  EthTransaction,
  Logger,
  Transaction,
} from "@finances/types";
import { smeq } from "@finances/utils";

import { getUnique } from "../utils";

const tag = "Maker";
export const makerAddresses = [

  { name: "maker-proxy-registry", address: "0x4678f0a6958e4d2bc4f1baf7bc52e8f3564f3fe4" },

  // Single-collateral DAI
  { name: "scd-gem-pit", address: "0x69076e44a9c70a67d5b79d95795aba299083c275" },
  { name: "scd-tub", address: "0x448a5065aebb8e423f0896e6c5d525c040f59af3" },

  // Multi-collateral DAI
  { name: "mcd-dai-join", address: "0x9759a6ac90977b93b58547b4a71c78317f391a28" },
  { name: "mcd-gem-join", address: "0x2f0b23f53734252bda2277357e97e1517d6b042a" },
  { name: "mcd-sai-join", address: "0xad37fd42185ba63009177058208dd1be4b136e6b" },
  { name: "mcd-vat", address: "0x35d1b3f3d7966a1dfe207aa4514c12a259a0492b" },

  // Oasis DEX
  { name: "oasis", address: "0x794e6e91555438afc3ccf1c5076a74f42133d08d" },
  { name: "oasis-old", address: "0x14fbca95be7e99c15cc2996c6c9d841e54b79425" },
  { name: "oasis-old", address: "0xb7ac09c2c0217b07d7c103029b4918a2c401eecb" },
  { name: "oasis-proxy", address: "0x793ebbe21607e4f04788f89c7a9b97320773ec59" },

].map(row => ({ ...row, category: AddressCategories.Defi })) as AddressBookJson;

export const parseMaker = (
  tx: Transaction,
  ethTx: EthTransaction,
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: tag });

  if (makerAddresses.some(a => smeq(a.address, ethTx.to))) {
    log.info(`Maker tx detected!`);
    tx.tags = getUnique([tag, ...tx.tags]);
  }

  /*
  for (const txLog of ethTx.logs) {
    const address = sm(txLog.address);
    if (isToken(address)) {
      const assetType = getName(address);
      const iface = getTokenInterface(address);
      const event = Object.values(iface.events).find(e => getEventTopic(e) === txLog.topics[0]);
      // MakerDAO SAI
      if (assetType === "SAI" && event.name === "Mint") {
        log.debug(`Minted ${quantity} ${assetType}`);
        transfer.category = TransferCategories.Borrow;
        tx.transfers.push({ ...transfer, from: AddressZero, to: args.guy });
      } else if (assetType === "SAI" && event.name === "Burn") {
        log.debug(`Burnt ${quantity} ${assetType}`);
        transfer.category = TransferCategories.Repay;
        tx.transfers.push({ ...transfer, from: args.guy, to: AddressZero });
      }
    }
  }
  */

  // log.debug(tx, `Done parsing ${tag}`);
  return tx;
};
