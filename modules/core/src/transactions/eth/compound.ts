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

const tag = "Compound";

export const compoundV1 = [
  { name: "compound-v1", address: "0x3fda67f7583380e67ef93072294a7fac882fd7e7" },
];

export const compoundV2 = [
  { name: "compound-maximillion", address: "0xf859a1ad94bcf445a406b892ef0d3082f4174088" },
  { name: "compound-comptroller", address: "0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b" },
];

// https://compound.finance/docs#networks
export const compoundV2Tokens = [
  { name: "cBAT", address: "0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e" },
  { name: "cCOMP", address: "0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4" },
  { name: "cDAI", address: "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643" },
  { name: "cETH", address: "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5" },
  { name: "cREP", address: "0x158079ee67fce2f58472a96584a73c7ab9ac95c1" },
  { name: "cSAI", address: "0xf5dce57282a584d2746faf1593d3121fcac444dc" },
  { name: "cUNI", address: "0x35a18000230da775cac24873d00ff85bccded550" },
  { name: "cUSDC", address: "0x39aa39c021dfbae8fac545936693ac917d5e7563" },
  { name: "cUSDT", address: "0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9" },
  { name: "cWBTC", address: "0xc11b1268c1a384e55c48c2391d8d480264a3a7f4" },
  { name: "cWBTCv2", address: "0xccf4429db6322d5c611ee964527d42e5d685dd6a" },
  { name: "cZRX", address: "0xb3319f5d18bc0d84dd1b4825dcde5d5f7266d407" },
];

export const compoundAddresses = [
  ...compoundV1,
  ...compoundV2,
  ...compoundV2Tokens,
].map(row => ({ ...row, category: AddressCategories.Compound })) as AddressBookJson;

export const getCompoundParser = (
  ethTx: EthTransaction,
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
): any => (
  tx: Transaction,
): Transaction => {
  const log = logger.child({ module: tag });

  // Move on if this ethTx doesn't interact with compound
  if (
    !compoundAddresses.some(a => smeq(a.address, ethTx.to))
    && !compoundAddresses.some(a =>
      tx.transfers.some(t => smeq(t.to, a.address) || smeq(t.from, a.address))
    )
  ) {
    return tx;
  }

  /*
  for (const txLog of ethTx.logs) {
    const address = sm(txLog.address);
    if (isToken(address)) {
      const assetType = getName(address);
      const iface = getTokenInterface(address);
      const event = Object.values(iface.events).find(e => getEventTopic(e) === txLog.topics[0]);
      // Compound V2 cETH
      if (
        addressBook.isCategory(AddressCategories.Compound)(address)
      ) {
        if (addressBook.getName(address) === "cETH") {
          quantity = formatUnits(quantityStr, 18); // cETH decimals != ETH decimals
          if (event.name === "Borrow") {
            log.info(`Compound - Borrowed ${quantity} ETH`);
            tx.transfers.push({
              ...transfer,
              assetType: "ETH",
              category: TransferCategories.Borrow,
              from: address,
              to: args.borrower,
              quantity,
            });
          } else if (addressBook.getName(address) === "cETH" && event.name === "RepayBorrow") {
            log.info(`Compound - Repaid ${quantity} ETH`);
            tx.transfers.push({
              ...transfer,
              assetType: "ETH",
              category: TransferCategories.Repay,
              from: args.borrower,
              to: address,
              quantity,
            });
          }
        } else {
          log.debug(`Compound - Ignoring ${event.name} ${quantity} ${assetType}`);
        }
      }
    }
  }
  */

  log.info(`Compound tx detected!`);
  tx.tags = getUnique([tag, ...tx.tags]);

  return tx;
};
