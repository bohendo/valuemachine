import { Interface } from "@ethersproject/abi";
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
  TransactionSources,
  Transfer,
  TransferCategories,
} from "@finances/types";
import { math, sm, smeq } from "@finances/utils";

import { getUnique, quantitiesAreClose } from "../utils";

const { add, round } = math;
const source = TransactionSources.Oasis;

////////////////////////////////////////
/// Addresses

const proxyAddresses = [
  { name: "oasis-proxy", address: "0x793ebbe21607e4f04788f89c7a9b97320773ec59" },
].map(row => ({ ...row, category: AddressCategories.Proxy })) as AddressBookJson;

const machineAddresses = [
  { name: "oasis-v1", address: "0x14fbca95be7e99c15cc2996c6c9d841e54b79425" },
  { name: "oasis-v2", address: "0xb7ac09c2c0217b07d7c103029b4918a2c401eecb" },
  { name: "eth2dai", address: "0x39755357759ce0d7f32dc8dc45414cca409ae24e" },
  { name: "OasisDex", address: "0x794e6e91555438afc3ccf1c5076a74f42133d08d" },
].map(row => ({ ...row, category: AddressCategories.Defi })) as AddressBookJson;

export const oasisAddresses = [
  ...proxyAddresses,
  ...machineAddresses,
];

////////////////////////////////////////
/// Interfaces

const oasisInterface = new Interface([
  "event LogNote(bytes4 indexed sig, address indexed guy, bytes32 indexed foo, bytes32 indexed bar, uint256 wad, bytes fax) anonymous",
  "event LogItemUpdate(uint256 id)",
  "event LogTrade(uint256 pay_amt, address indexed pay_gem, uint256 buy_amt, address indexed buy_gem)",
  "event LogMake(bytes32 indexed id, bytes32 indexed pair, address indexed maker, address pay_gem, address buy_gem, uint128 pay_amt, uint128 buy_amt, uint64 timestamp)",
  "event LogBump(bytes32 indexed id, bytes32 indexed pair, address indexed maker, address pay_gem, address buy_gem, uint128 pay_amt, uint128 buy_amt, uint64 timestamp)",
  "event LogTake(bytes32 id, bytes32 indexed pair, address indexed maker, address pay_gem, address buy_gem, address indexed taker, uint128 pay_amt, uint128 buy_amt, uint64 timestamp)",
  "event LogKill(bytes32 indexed id, bytes32 indexed pair, address indexed maker, address pay_gem, address buy_gem, uint128 pay_amt, uint128 buy_amt, uint64 timestamp)",
  "event LogBuyEnabled(bool isEnabled)",
  "event LogMinSell(address pay_gem, uint256 min_amount)",
  "event LogMatchingEnabled(bool isEnabled)",
  "event LogUnsortedOffer(uint256 id)",
  "event LogSortedOffer(uint256 id)",
  "event LogAddTokenPairWhitelist(address baseToken, address quoteToken)",
  "event LogRemTokenPairWhitelist(address baseToken, address quoteToken)",
  "event LogInsert(address keeper, uint256 id)",
  "event LogDelete(address keeper, uint256 id)"
]);

////////////////////////////////////////
/// Parser

export const oasisParser = (
  tx: Transaction,
  ethTx: EthTransaction,
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${source}${ethTx.hash.substring(0, 6)}` });
  const { getName, isProxy, isSelf } = addressBook;

  const isSelfy = (address: string): boolean =>
    isSelf(address) || (
      isSelf(ethTx.from) && isProxy(address) && smeq(address, ethTx.to)
    );

  const ethish = [AssetTypes.WETH, AssetTypes.ETH] as AssetTypes[];
  const findSwap = (quantity: string, asset: AssetTypes) => (transfer: Transfer): boolean =>
    transfer.category === TransferCategories.Transfer && (
      ethish.includes(asset) ? ethish.includes(transfer.assetType) : transfer.assetType === asset
    ) && quantitiesAreClose(quantity, transfer.quantity);

  let actor = isSelf(ethTx.from) ? ethTx.from : undefined;
  let inAsset;
  let outAsset;
  let inTotal = "0";
  let outTotal = "0";

  for (const txLog of ethTx.logs) {
    const address = sm(txLog.address);
    if (machineAddresses.some(e => smeq(e.address, address))) {
      tx.sources = getUnique([source, ...tx.sources]) as TransactionSources[];
      const event = Object.values(oasisInterface.events).find(e =>
        oasisInterface.getEventTopic(e) === txLog.topics[0]
      );
      if (!event) continue;
      const args = oasisInterface.parseLog(txLog).args;

      if (event.name === "LogTake") {
        log.info(`Parsing ${source} ${event.name} event`);
        let inAmt, inGem, outAmt, outGem;
        // ethTx.to might be a proxy which counts as self as far as this logic is concerned
        if (isSelfy(args.maker)) {
          actor = actor || args.maker;
          inGem = getName(args.buy_gem);
          outGem = getName(args.pay_gem);
          inAmt = formatUnits(args.buy_amt, chainData.getTokenData(address).decimals);
          outAmt = formatUnits(args.pay_amt, chainData.getTokenData(address).decimals);
        } else if (isSelfy(args.taker)) {
          actor = actor || args.taker;
          inGem = getName(args.pay_gem);
          outGem = getName(args.buy_gem);
          inAmt = formatUnits(args.pay_amt, chainData.getTokenData(address).decimals);
          outAmt = formatUnits(args.buy_amt, chainData.getTokenData(address).decimals);
        } else {
          continue;
        }
        log.debug(`Parsed ${inAmt} ${inGem} incoming & ${outAmt} ${outGem} outgoing`);
        if (inAsset && inAsset !== inGem) {
          log.warn(`Found more than one type of inAsset: ${inAsset} & ${inGem}`);
        } else if (!inAsset) {
          inAsset = inGem;
        }
        if (outAsset && outAsset !== outGem) {
          log.warn(`Found more than one type of outAsset: ${outAsset} & ${outGem}`);
        } else if (!outAsset) {
          outAsset = outGem;
        }

        const inIndex = tx.transfers.findIndex(findSwap(inAmt, inAsset));
        if (inIndex >= 0) {
          tx.transfers[inIndex].category = TransferCategories.SwapIn;
        } else {
          log.debug(`Can't find swap in transfer for ${inAmt} ${inAsset}`);
        }

        const outIndex = tx.transfers.findIndex(findSwap(outAmt, outAsset));
        if (outIndex >= 0) {
          tx.transfers[outIndex].category = TransferCategories.SwapOut;
          outAsset = tx.transfers[outIndex].assetType;
        } else {
          log.debug(`Can't find swap out transfer for ${outAmt} ${outAsset}`);
        }

        inTotal = add(inTotal, inAmt);
        outTotal = add(outTotal, outAmt);
      } else {
        log.debug(`Skipping ${source} ${event.name} event`);
      }

    }
  }

  if (!tx.sources.includes(source)) {
    return tx;
  }

  const inIndex = tx.transfers.findIndex(findSwap(inTotal, inAsset));
  if (inIndex >= 0) {
    tx.transfers[inIndex].category = TransferCategories.SwapIn;
    inAsset = tx.transfers[inIndex].assetType;
  } else {
    log.debug(`Can't find swap in transfer for ${inTotal} ${inAsset}`);
  }

  const outIndex = tx.transfers.findIndex(findSwap(outTotal, outAsset));
  if (outIndex >= 0) {
    tx.transfers[outIndex].category = TransferCategories.SwapOut;
    outAsset = tx.transfers[outIndex].assetType;
  } else {
    log.debug(`Can't find swap out transfer for ${outTotal} ${outAsset}`);
  }

  const description = `${getName(actor)} swapped ${
    round(outTotal)} ${outAsset
  } for ${
    round(inTotal)} ${inAsset
  } via ${source}`;
  log.info(description);
  tx.description = description;

  // log.debug(tx, `Done parsing ${source}`);
  return tx;
};

