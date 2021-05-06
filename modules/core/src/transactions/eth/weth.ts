import { Contract } from "@ethersproject/contracts";
import { formatUnits } from "@ethersproject/units";
import {
  AddressBook,
  AddressBookJson,
  AddressCategories,
  AssetTypes,
  ChainData,
  EthTransaction,
  Logger,
  Transaction,
  TransferCategories,
} from "@finances/types";
import { sm, smeq } from "@finances/utils";

import { getUnique } from "../utils";

const tag = "Weth";
export const erc20Addresses = [
].map(row => ({ ...row, category: AddressCategories.ERC20 })) as AddressBookJson;

export const wethAddresses = [
  { name: "WETH", address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" },
].map(row => ({ ...row, category: AddressCategories.ERC20 })) as AddressBookJson;

const weth = new Contract(wethAddresses[0].address, [
  "event Approval(address indexed s/rc, address indexed guy, uint256 wad)",
  "event Deposit(address indexed dst, uint256 wad)",
  "event Transfer(address indexed src, address indexed dst, uint256 wad)",
  "event Withdrawal(address indexed src, uint256 wad)",
  "function allowance(address, address) view returns (uint256)",
  "function approve(address guy, uint256 wad) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function deposit() payable",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function transfer(address dst, uint256 wad) returns (bool)",
  "function transferFrom(address src, address dst, uint256 wad) returns (bool)",
  "function withdraw(uint256 wad)",
]);

export const parseWeth = (
  tx: Transaction,
  ethTx: EthTransaction,
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: tag });

  for (const txLog of ethTx.logs) {
    const address = sm(txLog.address);
    if (address === weth.address) {
      const assetType = AssetTypes.WETH;
      const event = Object.values(weth.events).find(e =>
        weth.inerface.getEventTopic(e) === txLog.topics[0]
      );
      log.info(`Found a ${tag} ${event.name} event`);
      const args = weth.parseLog(txLog).args;
      const amount = formatUnits(args.wad, chainData.getTokenData(address).decimals);
      const index = txLog.index || 1;

      if (event.name === "Deposit") {
        if (smeq(ethTx.to, weth.address)) {
          tx.description = `Swapped ${amount} ETH for WETH`;
        }
        tx.tags = getUnique([tag, ...tx.tags]);
        tx.transfers.push({
          assetType,
          category: TransferCategories.SwapIn,
          from: address,
          index,
          quantity: amount,
          to: args.dst,
        });
        // TODO: update eth transfer category to swap out

      } else if (event.name === "Withdrawal") {
        if (smeq(ethTx.to, weth.address)) {
          tx.description = `Swapped ${amount} WETH for ETH`;
        }
        tx.tags = getUnique([tag, ...tx.tags]);
        tx.transfers.push({
          assetType,
          category: TransferCategories.SwapOut,
          from: args.src,
          index,
          quantity: amount,
          to: address,
        });
        // TODO: update eth call category to swap in

      } else if (event.name === "Transfer" || event.name === "Approve") {
        log.debug(`Skipping ${tag} event: ${event.name}`);

      } else {
        log.warn(`Unknown ${tag} event: ${event.name}`);
      }

    }
  }

  // log.debug(tx, `Done parsing ${tag}`);
  return tx;
};
