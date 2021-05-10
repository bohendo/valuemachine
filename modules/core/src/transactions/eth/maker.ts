import { Interface } from "@ethersproject/abi";
import { BigNumber } from "@ethersproject/bignumber";
import { hexlify, stripZeros } from "@ethersproject/bytes";
import { AddressZero } from "@ethersproject/constants";
import { formatUnits } from "@ethersproject/units";
import {
  AddressBook,
  AddressBookJson,
  AddressCategories,
  AssetTypes,
  TransferCategories,
  ChainData,
  EthTransaction,
  Logger,
  Transaction,
  TransactionSources,
} from "@finances/types";
import { math, sm, smeq } from "@finances/utils";

import { getUnique } from "../utils";

const { round } = math;

// MCD was launched on Nov 18th 2019

const source = TransactionSources.Maker;

////////////////////////////////////////
/// Addresses

const tubAddress = "0x448a5065aebb8e423f0896e6c5d525c040f59af3";
const pethAddress = "0xf53ad2c6851052a81b42133467480961b2321c09";

const machineAddresses = [
  { name: "maker-proxy-registry", address: "0x4678f0a6958e4d2bc4f1baf7bc52e8f3564f3fe4" },
  // Single-collateral DAI
  { name: "scd-gem-pit", address: "0x69076e44a9c70a67d5b79d95795aba299083c275" },
  { name: "scd-tub", address: tubAddress },
  { name: "scd-cage", address: "0x9fdc15106da755f9ffd5b0ba9854cfb89602e0fd" },
  { name: "scd-mcd-migration", address: "0xc73e0383f3aff3215e6f04b0331d58cecf0ab849" },
  // Multi-collateral DAI
  { name: "mcd-dai-join", address: "0x9759a6ac90977b93b58547b4a71c78317f391a28" },
  { name: "mcd-gem-join", address: "0x2f0b23f53734252bda2277357e97e1517d6b042a" },
  { name: "mcd-sai-join", address: "0xad37fd42185ba63009177058208dd1be4b136e6b" },
  { name: "mcd-vat", address: "0x35d1b3f3d7966a1dfe207aa4514c12a259a0492b" },
].map(row => ({ ...row, category: AddressCategories.Defi })) as AddressBookJson;

const tokenAddresses = [
  { name: "SAI", address: "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359" },
  { name: "PETH", address: pethAddress },
  { name: "DAI", address: "0x6b175474e89094c44da98b954eedeac495271d0f" },
].map(row => ({ ...row, category: AddressCategories.ERC20 })) as AddressBookJson;

const govTokenAddresses = [
  { name: "MKR", address: "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2" },
].map(row => ({ ...row, category: AddressCategories.ERC20 })) as AddressBookJson;

export const makerAddresses = [
  ...machineAddresses,
  ...tokenAddresses,
  ...govTokenAddresses,
] as AddressBookJson;

////////////////////////////////////////
/// Interfaces

const tokenInterface = new Interface([
  "event Approval(address indexed src, address indexed guy, uint256 wad)",
  "event Burn(address indexed guy, uint256 wad)",
  "event LogNote(bytes4 indexed sig, address indexed guy, bytes32 indexed foo, bytes32 indexed bar, uint256 wad, bytes fax) anonymous",
  "event Mint(address indexed guy, uint256 wad)",
  "event Transfer(address indexed src, address indexed dst, uint256 wad)"
]);

const tubInterface = new Interface([
  "event LogNewCup(address indexed lad, bytes32 cup)",
  "event LogNote(bytes4 indexed sig, address indexed guy, bytes32 indexed foo, bytes32 indexed bar, uint256 wad, bytes fax) anonymous",
  "function join(uint256 wad)",
  "function exit(uint256 wad)",
  "function open() returns (bytes32 cup)",
  "function give(bytes32 cup, address guy)",
  "function lock(bytes32 cup, uint256 wad)",
  "function free(bytes32 cup, uint256 wad)",
  "function draw(bytes32 cup, uint256 wad)",
  "function wipe(bytes32 cup, uint256 wad)",
  "function shut(bytes32 cup)",
  "function bite(bytes32 cup)",
]);

////////////////////////////////////////
/// Parser

export const makerParser = (
  tx: Transaction,
  ethTx: EthTransaction,
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${source}${ethTx.hash.substring(0, 6)}` });
  const { getName } = addressBook;

  if (machineAddresses.some(e => smeq(e.address, ethTx.to))) {
    tx.sources = getUnique([source, ...tx.sources]) as TransactionSources[];
  }

  for (const txLog of ethTx.logs) {
    const address = sm(txLog.address);

    if (machineAddresses.some(e => smeq(e.address, address))) {
      tx.sources = getUnique([source, ...tx.sources]) as TransactionSources[];
    }

    ////////////////////////////////////////
    // SAI/DAI/PETH
    if (tokenAddresses.some(e => smeq(e.address, address))) {
      const assetType = getName(address) as AssetTypes;
      const event = Object.values(tokenInterface.events).find(e =>
        tokenInterface.getEventTopic(e) === txLog.topics[0]
      );
      if (!event) continue;
      log.info(`Found ${source} ${assetType} ${event.name} event`);
      const args = tokenInterface.parseLog(txLog).args;
      const amount = formatUnits(args.wad, chainData.getTokenData(address).decimals);
      const index = txLog.index || 1;

      if (event.name === "Mint") {
        tx.transfers.push({
          assetType,
          category: smeq(address, pethAddress)
            ? TransferCategories.SwapIn
            : TransferCategories.Borrow,
          from: AddressZero,
          index,
          quantity: amount,
          to: args.guy,
        });
        // If peth, categorize the matching deposit as swap out
        if (smeq(address, pethAddress)) {
          const swapOut = tx.transfers.findIndex(t => t.assetType === AssetTypes.WETH);
          if (swapOut >= 0) {
            tx.transfers[swapOut].category = TransferCategories.SwapOut;
            if (smeq(ethTx.to, tubAddress)) {
              tx.description = `${getName(args.guy)} swapped ${
                round(tx.transfers[swapOut].quantity, 4)
              } WETH for ${round(amount, 4)} PETH`;
            }
          } else {
            log.warn(ethTx, `Couldn't find an associated SwapOut WETH transfer`);
          }
        } else {
          if (smeq(ethTx.to, tubAddress)) {
            tx.description = `${getName(args.guy)} borrowed ${round(amount)} ${assetType}`;
          }
        }

      } else if (event.name === "Burn") {
        tx.transfers.push({
          assetType,
          category: smeq(address, pethAddress)
            ? TransferCategories.SwapOut
            : TransferCategories.Repay,
          from: args.guy,
          index,
          quantity: amount,
          to: AddressZero,
        });
        // If peth, categorize the matching withdraw as swap in
        if (smeq(address, pethAddress)) {
          const swapIn = tx.transfers.findIndex(t => t.assetType === AssetTypes.WETH);
          if (swapIn >= 0) {
            tx.transfers[swapIn].category = TransferCategories.SwapIn;
            if (smeq(ethTx.to, tubAddress)) {
              tx.description = `${getName(args.guy)} swapped ${round(amount, 4)} PETH for ${
                round(tx.transfers[swapIn].quantity, 4)
              } WETH`;
            }
          } else {
            log.warn(ethTx, `Couldn't find an associated SwapIn WETH transfer`);
          }
        } else {
          const fee = tx.transfers.findIndex(t => t.assetType === AssetTypes.MKR);
          if (fee >= 0) {
            tx.transfers[fee].category = TransferCategories.Expense;
          } else {
            log.warn(ethTx, `Couldn't find an associated fee MKR transfer`);
          }
          if (smeq(ethTx.to, tubAddress)) {
            tx.description = `${getName(args.guy)} repayed ${round(amount)} ${assetType}`;
          }
        }

      }

    ////////////////////////////////////////
    // Tub
    } else if (smeq(address, tubAddress)) {
      const event = Object.values(tubInterface.events).find(e =>
        tubInterface.getEventTopic(e) === txLog.topics[0]
      );
      if (event?.name === "LogNewCup" && smeq(ethTx.to, tubAddress)) {
        const args = tubInterface.parseLog(txLog).args;
        tx.description = `${getName(args.lad)} opened new CDP #${BigNumber.from(args.cup)}`;
        continue;
      }
      const fnCall = Object.values(tubInterface.functions).find(e =>
        txLog.topics[0].startsWith(tubInterface.getSighash(e))
      );
      if (!fnCall) continue;
      log.info(`Found Tub ${fnCall.name} function call`);
      const actor = getName(hexlify(stripZeros(txLog.topics[1])));
      const cup = BigNumber.from(hexlify(stripZeros(txLog.topics[2])));

      if (fnCall.name === "give" && smeq(ethTx.to, tubAddress)) {
        const recipient = hexlify(stripZeros(txLog.topics[3]));
        tx.description = `${actor} gave CDP #${cup} to ${getName(recipient)}`;

      } else if (fnCall.name === "bite" && smeq(ethTx.to, tubAddress)) {
        tx.description = `${actor} bit CDP #${cup}`;

      } else if (fnCall.name === "shut" && smeq(ethTx.to, tubAddress)) {
        tx.description = `${actor} shut CDP #${cup}`;

      // Categorize PETH transfer as deposit or withdraw
      } else if (fnCall.name === "lock" || fnCall.name === "free") {
        const amount = formatUnits(txLog.topics[3], chainData.getTokenData(address).decimals);
        const assetType = AssetTypes.PETH;
        const transfer = tx.transfers.findIndex(t => t.assetType === assetType);
        if (smeq(tx.transfers[transfer].to, tubAddress)) {
          tx.transfers[transfer].category = TransferCategories.Deposit;
          if (smeq(ethTx.to, tubAddress)) {
            tx.description = `${getName(tx.transfers[transfer].from)} deposited ${
              round(amount, 4)
            } ${assetType}`;
          }
        } else if (smeq(tx.transfers[transfer].from, tubAddress)) {
          tx.transfers[transfer].category = TransferCategories.Withdraw;
          if (smeq(ethTx.to, tubAddress)) {
            tx.description = `${getName(tx.transfers[transfer].to)} withdrew ${
              round(amount, 4)
            } ${assetType}`;
          }
        }

      }

    }
  }

  // log.debug(tx, `Done parsing ${source}`);
  return tx;
};
