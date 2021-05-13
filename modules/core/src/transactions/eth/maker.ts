import { Interface } from "@ethersproject/abi";
import { hexlify, stripZeros } from "@ethersproject/bytes";
import { AddressZero, HashZero } from "@ethersproject/constants";
import { formatUnits } from "@ethersproject/units";
import {
  AddressBook,
  AddressBookJson,
  AddressCategories,
  AssetTypes,
  ChainData,
  EthTransaction,
  EthTransactionLog,
  Logger,
  Transaction,
  TransactionSources,
  TransferCategories,
} from "@finances/types";
import { math, sm, smeq, toBN } from "@finances/utils";

import { getUnique, quantitiesAreClose } from "../utils";

const { abs, div, gt, round } = math;

const source = TransactionSources.Maker;

////////////////////////////////////////
/// Addresses

const tubAddress = "0x448a5065aebb8e423f0896e6c5d525c040f59af3";
const vatAddress = "0x35d1b3f3d7966a1dfe207aa4514c12a259a0492b";
const potAddress = "0x197e90f9fad81970ba7976f33cbd77088e5d7cf7";
const pethAddress = "0xf53ad2c6851052a81b42133467480961b2321c09";
const saiCageAddress = "0x9fdc15106da755f9ffd5b0ba9854cfb89602e0fd";
const mcdMigrationAddress = "0xc73e0383f3aff3215e6f04b0331d58cecf0ab849";
const managerAddress = "0x5ef30b9986345249bc32d8928b7ee64de9435e39";

const proxyAddresses = [
  { name: "maker-proxy-registry", address: "0x4678f0a6958e4d2bc4f1baf7bc52e8f3564f3fe4" },
  { name: "maker-proxy-factory", address: "0xa26e15c895efc0616177b7c1e7270a4c7d51c997" },
].map(row => ({ ...row, category: AddressCategories.Defi })) as AddressBookJson;

const machineAddresses = [
  // Single-collateral DAI
  { name: "scd-cage", address: saiCageAddress },
  { name: "scd-gem-pit", address: "0x69076e44a9c70a67d5b79d95795aba299083c275" },
  { name: "scd-tap", address: "0xbda109309f9fafa6dd6a9cb9f1df4085b27ee8ef" },
  { name: "scd-tub", address: tubAddress },
  { name: "scd-vox", address: "0x9b0f70df76165442ca6092939132bbaea77f2d7a" },
  // Multi-collateral DAI (deployed on Nov 18th 2019)
  { name: "mcd-dai-join", address: "0x9759a6ac90977b93b58547b4a71c78317f391a28" },
  { name: "mcd-gem-join", address: "0x2f0b23f53734252bda2277357e97e1517d6b042a" },
  { name: "mcd-migration", address: mcdMigrationAddress },
  { name: "mcd-pot", address: potAddress },
  { name: "mcd-sai-join", address: "0xad37fd42185ba63009177058208dd1be4b136e6b" },
  { name: "mcd-vat", address: vatAddress },
  { name: "mcd-manager", address: managerAddress },
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
  ...proxyAddresses,
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

const vatInterface = new Interface([
  "event LogNote(bytes4 indexed sig, bytes32 indexed arg1, bytes32 indexed arg2, bytes32 indexed arg3, bytes data) anonymous",
  "function cage()",
  "function can(address, address) view returns (uint256)",
  "function dai(address) view returns (uint256)",
  "function debt() view returns (uint256)",
  "function deny(address usr)",
  "function file(bytes32 ilk, bytes32 what, uint256 data)",
  "function file(bytes32 what, uint256 data)",
  "function flux(bytes32 ilk, address src, address dst, uint256 wad)",
  "function fold(bytes32 i, address u, int256 rate)",
  "function fork(bytes32 ilk, address src, address dst, int256 dink, int256 dart)",
  "function frob(bytes32 i, address u, address v, address w, int256 dink, int256 dart)",
  "function gem(bytes32, address) view returns (uint256)",
  "function grab(bytes32 i, address u, address v, address w, int256 dink, int256 dart)",
  "function heal(uint256 rad)",
  "function hope(address usr)",
  "function ilks(bytes32) view returns (uint256 Art, uint256 rate, uint256 spot, uint256 line, uint256 dust)",
  "function init(bytes32 ilk)",
  "function Line() view returns (uint256)",
  "function live() view returns (uint256)",
  "function move(address src, address dst, uint256 rad)",
  "function nope(address usr)",
  "function rely(address usr)",
  "function sin(address) view returns (uint256)",
  "function slip(bytes32 ilk, address usr, int256 wad)",
  "function suck(address u, address v, uint256 rad)",
  "function urns(bytes32, address) view returns (uint256 ink, uint256 art)",
  "function vice() view returns (uint256)",
  "function wards(address) view returns (uint256)"
]);

const potInterface = new Interface([
  "event LogNote(bytes4 indexed sig, address indexed usr, bytes32 indexed arg1, bytes32 indexed arg2, bytes data) anonymous",
  "function Pie() view returns (uint256)",
  "function cage()",
  "function chi() view returns (uint256)",
  "function deny(address guy)",
  "function drip() returns (uint256 tmp)",
  "function dsr() view returns (uint256)",
  "function exit(uint256 wad)",
  "function file(bytes32 what, address addr)",
  "function file(bytes32 what, uint256 data)",
  "function join(uint256 wad)",
  "function live() view returns (uint256)",
  "function pie(address) view returns (uint256)",
  "function rely(address guy)",
  "function rho() view returns (uint256)",
  "function vat() view returns (address)",
  "function vow() view returns (address)",
  "function wards(address) view returns (uint256)"
]);

const proxyInterface = new Interface([
  "event Created(address indexed sender, address indexed owner, address proxy, address cache)"
]);

////////////////////////////////////////
/// Parser

const parseLogNote = (
  iface: Interface,
  ethLog: EthTransactionLog
): { name: string; args: string[]} => ({
  name: Object.values(iface.functions).find(e =>
    ethLog.topics[0].startsWith(iface.getSighash(e))
  )?.name,
  args: ethLog.data
    .substring(2 + 64 + 64 + 8)
    .match(/.{1,64}/g)
    .filter(e => e !== "0".repeat(64 - 8))
    .map(s => `0x${s}`)
    .map(str => [HashZero, "0x"].includes(str)
      ? "0x00"
      : str.startsWith("0x000000000000000000000000")
        ? `0x${str.substring(26)}`
        : str
    ),
});

export const makerParser = (
  tx: Transaction,
  ethTx: EthTransaction,
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${source}${ethTx.hash.substring(0, 6)}` });
  const { getName, isProxy, isSelf } = addressBook;
  // log.debug(tx, `Parsing in-progress tx`);

  const ethish = [AssetTypes.WETH, AssetTypes.ETH, AssetTypes.PETH] as AssetTypes[];

  const isSelfy = (address: string): boolean =>
    isSelf(address) || (isSelf(ethTx.from) && isProxy(address) && smeq(address, ethTx.to));

  if (machineAddresses.some(e => smeq(e.address, ethTx.to))) {
    tx.sources = getUnique([source, ...tx.sources]) as TransactionSources[];
  }

  // SCD -> MCD Migration
  if (smeq(ethTx.to, mcdMigrationAddress)) {
    const swapOut = tx.transfers.findIndex(t => t.assetType === AssetTypes.SAI);
    if (swapOut >= 0) {
      tx.transfers[swapOut].category = TransferCategories.SwapOut;
    } else {
      log.warn(`Couldn't find a SwapOut SAI transfer`);
    }
    const swapIn = tx.transfers.findIndex(t => t.assetType === AssetTypes.DAI);
    if (swapIn >= 0) {
      tx.transfers[swapIn].category = TransferCategories.SwapIn;
    } else {
      log.warn(`Couldn't find an associated SwapIn DAI transfer`);
    }
    tx.description = `${getName(ethTx.from)} migrated ${
      round(tx.transfers[swapOut].quantity)
    } SAI to DAI`;
    return tx;
  }

  for (const txLog of ethTx.logs) {
    const address = sm(txLog.address);
    if (machineAddresses.some(e => smeq(e.address, address))) {
      tx.sources = getUnique([source, ...tx.sources]) as TransactionSources[];
    }

    ////////////////////////////////////////
    // Proxies
    if (proxyAddresses.some(e => smeq(address, e.address))) {
      const event = Object.values(proxyInterface.events).find(e =>
        proxyInterface.getEventTopic(e) === txLog.topics[0]
      );
      if (event?.name === "Created") {
        const args = proxyInterface.parseLog(txLog).args;
        const proxy = sm(args.proxy);
        const owner = sm(args.owner);
        if (!addressBook.isPresent(proxy)) {
          log.info(`Found CDP proxy creation, adding ${proxy} to our addressBook`);
          addressBook.newAddress(sm(proxy), AddressCategories.Proxy, "CDP");
        } else {
          log.info(`Found CDP proxy creation but ${proxy} is already in our addressBook`);
        }
        if (proxyAddresses.some(e => smeq(e.address, ethTx.to))) {
          tx.description = `${getName(owner)} created a new CDP proxy`;
        }
      }
    }

    ////////////////////////////////////////
    // Tokens
    if (tokenAddresses.some(e => smeq(e.address, address))) {
      const assetType = getName(address) as AssetTypes;
      const event = Object.values(tokenInterface.events).find(e =>
        tokenInterface.getEventTopic(e) === txLog.topics[0]
      );
      if (!event) continue;
      const args = tokenInterface.parseLog(txLog).args;
      const amount = formatUnits(args.wad, chainData.getTokenData(address).decimals);
      const index = txLog.index || 1;

      ////////////////////////////////////////
      // PETH
      if (smeq(address, pethAddress) && isSelf(args.guy)) {
        if (event.name === "Mint") {
          tx.transfers.push({
            assetType,
            category: TransferCategories.SwapIn,
            from: AddressZero,
            index,
            quantity: amount,
            to: args.guy,
          });
          const swapOut = tx.transfers.findIndex(t => t.assetType === AssetTypes.WETH);
          if (swapOut >= 0) {
            tx.transfers[swapOut].category = TransferCategories.SwapOut;
            tx.description = `${getName(ethTx.from)} swapped ${
              round(tx.transfers[swapOut].quantity, 4)
            } WETH for ${round(amount, 4)} PETH`;
          } else {
            log.warn(`Couldn't find an associated SwapOut WETH transfer`);
          }

        } else if (event.name === "Burn") {
          tx.transfers.push({
            assetType,
            category: TransferCategories.SwapOut,
            from: args.guy,
            index,
            quantity: amount,
            to: AddressZero,
          });
          const swapIn = tx.transfers.findIndex(t => t.assetType === AssetTypes.WETH);
          if (swapIn >= 0) {
            tx.transfers[swapIn].category = TransferCategories.SwapIn;
            tx.description = `${getName(ethTx.from)} swapped ${round(amount, 4)} PETH for ${
              round(tx.transfers[swapIn].quantity, 4)
            } WETH`;
          } else {
            log.warn(`Couldn't find an associated SwapIn WETH transfer`);
          }
        }

      ////////////////////////////////////////
      // SAI/DAI
      } else {
        if (event.name === "Mint") {
          log.info(`Parsing ${assetType} ${event.name} event`);
          if (isSelf(args.guy)) {
            tx.transfers.push({
              assetType,
              category: TransferCategories.Borrow,
              from: AddressZero,
              index,
              quantity: amount,
              to: args.guy,
            });
          // If args.guy aka from is not self, then categorize the tx from proxy->self
          // TODO: move this to tub logNote parser?
          } else {
            const fromProxy = tx.transfers.findIndex(t =>
              isSelf(t.to) && t.assetType === assetType && t.quantity === amount
            );
            if (fromProxy >= 0) {
              tx.transfers[fromProxy].category = TransferCategories.Borrow;
            } else {
              log.warn(`Couldn't match ${assetType} ${event.name} to an action taken by self`);
            }
          }
          tx.description = `${getName(ethTx.from)} borrowed ${round(amount)} ${assetType} from CDP`;

        } else if (event.name === "Burn") {
          log.info(`Parsing ${assetType} ${event.name} event`);
          if (isSelf(args.guy)) {
            tx.transfers.push({
              assetType,
              category: TransferCategories.Repay,
              from: args.guy,
              index,
              quantity: amount,
              to: AddressZero,
            });
          // During global settlement, the cage is used to redeem no-longer-stable-coins for gems
          } else if (smeq(args.guy, saiCageAddress)) {
            const swapOut = tx.transfers.findIndex(t =>
              gt(t.quantity, "0") && t.assetType === AssetTypes.SAI
            );
            if (swapOut >= 0) {
              tx.transfers[swapOut].category = TransferCategories.SwapOut;
            } else {
              log.warn(`Couldn't find a SwapOut SAI transfer to associate w cashout`);
            }
            const swapIn = tx.transfers.findIndex(t =>
              gt(t.quantity, "0") && t.assetType === AssetTypes.ETH
            );
            if (swapIn >= 0) {
              tx.transfers[swapIn].category = TransferCategories.SwapIn;
            } else {
              log.warn(`Couldn't find a SwapIn ETH transfer to associate w cashout`);
            }
            tx.description = `${getName(ethTx.from)} redeemed ${round(amount, 4)} SAI for ${
              swapIn >= 0 ? round(tx.transfers[swapIn].quantity, 4) : "some"
            } ETH`;
          // If neither self nor cage is burning, then categorize the tx from self->proxy
          } else {
            // TODO: move this to tub logNote parser?
            log.info(`Looking for proxy/self interaction`);
            const toProxy = tx.transfers.findIndex(t =>
              t.assetType === assetType && t.quantity === amount
            );
            if (toProxy >= 0) {
              tx.transfers[toProxy].category = TransferCategories.Repay;
            } else if (!isProxy(ethTx.to)) {
              log.warn(`Couldn't match ${assetType} ${event.name} to an action taken by self`);
            }
          }
          if (!smeq(args.guy, saiCageAddress)) {
            // Handle MKR fee (or find the stable-coins spent to buy MKR)
            const feeAsset = [AssetTypes.MKR, AssetTypes.SAI, AssetTypes.DAI] as AssetTypes[];
            const fee = tx.transfers.findIndex(t =>
              ([
                TransferCategories.SwapOut, // Maybe we gave our fee to OasisDex to swap for MKR
                TransferCategories.Transfer
              ] as TransferCategories[]).includes(t.category)
              && isSelfy(t.from) &&
              feeAsset.includes(t.assetType)
            );
            if (fee >= 0) {
              tx.transfers[fee].category = TransferCategories.Expense;
            } else {
              log.warn(`Couldn't find an associated MKR/SAI/DAI fee`);
            }
            tx.description = `${getName(ethTx.from)} repayed ${round(amount)} ${assetType} to CDP`;
          }

        } else if (["Approval", "Transfer"].includes(event.name)) {
          log.debug(`Skipping ${event.name} event from ${assetType}`);
        } else {
          log.warn(`Unknown ${event.name} event from ${assetType}`);
        }
      }

    ////////////////////////////////////////
    // SCD Tub
    } else if (smeq(address, tubAddress)) {
      const event = Object.values(tubInterface.events).find(e =>
        tubInterface.getEventTopic(e) === txLog.topics[0]
      );
      if (event?.name === "LogNewCup") {
        const args = tubInterface.parseLog(txLog).args;
        tx.description = `${getName(args.lad)} opened new CDP #${BigNumber.from(args.cup)}`;
        continue;
      }
      const logNote = parseLogNote(tubInterface, txLog);
      if (!logNote.name || logNote.name === "open") continue;
      log.debug(`Found Tub call ${txLog.topics[0].substring(0,10)}: ${logNote.name}(${
        logNote.args.map(a => a.length > 16 ? a.substring(0, 18) + ".." : a)
      })`);

      // TODO: use ethers.utils.getAddress
      const actor = getName(hexlify(stripZeros(logNote.args[0])));
      const cup = BigNumber.from(hexlify(stripZeros(logNote.args[1])));

      if (logNote.name === "give") {
        const recipient = hexlify(stripZeros(logNote.args[2]));
        tx.description = `${actor} gave CDP #${cup} to ${getName(recipient)}`;

      } else if (logNote.name === "bite") {
        tx.description = `${actor} bit CDP #${cup}`;

      } else if (logNote.name === "shut") {
        tx.description = `${actor} shut CDP #${cup}`;

      // Categorize PETH transfer as deposit or withdraw
      } else if (logNote.name === "lock" || logNote.name === "free") {
        // Can't match on amounts bc PETH amount !== W/ETH amount
        const transfer = tx.transfers.findIndex(t =>
          ethish.includes(t.assetType) &&
          t.category === TransferCategories.Transfer &&
          (isSelf(t.to) || isSelf(t.from))
        );
        if (transfer >= 0 ) {
          if (isSelf(tx.transfers[transfer].from)) {
            tx.transfers[transfer].category = TransferCategories.Deposit;
            tx.description = `${getName(tx.transfers[transfer].from)} deposited ${
              round(tx.transfers[transfer].quantity, 4)
            } ${tx.transfers[transfer].assetType} into CDP`;
          } else if (isSelf(tx.transfers[transfer].to)) {
            tx.transfers[transfer].category = TransferCategories.Withdraw;
            tx.description = `${getName(tx.transfers[transfer].to)} withdrew ${
              round(tx.transfers[transfer].quantity, 4)
            } ${tx.transfers[transfer].assetType} from CDP`;
          }
        } else {
          // Sometimes there are duplicate lock/free events
          const desired = [TransferCategories.Deposit, TransferCategories.Withdraw];
          const transfer = tx.transfers.findIndex(t =>
            ethish.includes(t.assetType) && (desired as TransferCategories[]).includes(t.category)
          );
          if (transfer < 0) {
            log.warn(`Couldn't find a transfer assocated with CDP ${logNote.name}`);
          }
        }

      }

    ////////////////////////////////////////
    // MCD Vat aka CDP manager
    } else if (smeq(address, vatAddress)) {
      const logNote = parseLogNote(vatInterface, txLog);
      if (!logNote.name) continue;
      log.debug(`Found Vat call ${txLog.topics[0].substring(0,10)}: ${logNote.name}(${
        logNote.args.map(a => a.length > 16 ? a.substring(0, 18) + ".." : a)
      })`);

      // Deposit Collateral
      if (logNote.name === "slip") {
        // NOTE: Hacky fix assumes that the joiner calls transfer immediately after slip
        // slip accepts ilk which is a bytes32 that maps to the token address, not super useful
        const asset = ethTx.logs.find(l => l.index === txLog.index + 1).address;
        if (!asset) {
          log.warn(`Unable to find the token address for ilk ${logNote.args[0]}`);
          continue;
        }
        const wad = formatUnits(
          BigNumber.from(logNote.args[2] || "0x00").fromTwos(256),
          chainData.getTokenData(asset)?.decimals || 18,
        );
        const assetType = getName(asset) as AssetTypes;
        log.info(`Found a change in CDP collateral of about ${wad} ${assetType}`);
        const transfer = tx.transfers.findIndex(transfer =>
          (
            smeq(transfer.assetType, assetType) || (
              ethish.includes(assetType) && ethish.includes(transfer.assetType)
            )
          ) && quantitiesAreClose(transfer.quantity, abs(wad), div(abs(wad), "10"))
        );
        if (transfer >= 0) {
          if (gt(wad, "0")) {
            tx.transfers[transfer].category = TransferCategories.Deposit;
            tx.description = `${getName(tx.transfers[transfer].from)} deposited ${
              round(wad, 4)
            } ${assetType} into CDP`;
          } else {
            tx.transfers[transfer].category = TransferCategories.Withdraw;
            tx.description = `${getName(tx.transfers[transfer].to)} withdrew ${
              round(abs(wad), 4)
            } ${assetType} from CDP`;
          }
        } else {
          log.warn(`Unable to find transfer of about ${wad} ${assetType}`);
        }

      // Borrow/Repay DAI
      } else if (logNote.name === "frob") {
        const dart = formatUnits(BigNumber.from(logNote.args[5] || "0x00").fromTwos(256));
        log.info(`Found a change in CDP debt of about ${round(dart)} DAI`);
        const transfer = tx.transfers.findIndex(transfer =>
          transfer.assetType === AssetTypes.DAI
          && quantitiesAreClose(transfer.quantity, abs(dart), div(abs(dart), "10"))
        );
        if (transfer >= 0) {
          if (gt(dart, "0")) {
            tx.transfers[transfer].category = TransferCategories.Borrow;
            tx.description = `${getName(tx.transfers[transfer].to)} borrowed ${
              round(tx.transfers[transfer].quantity)
            } DAI from CDP`;
          } else {
            tx.transfers[transfer].category = TransferCategories.Repay;
            tx.description = `${getName(tx.transfers[transfer].from)} repayed ${
              round(tx.transfers[transfer].quantity)
            } DAI into CDP`;
          }
        } else {
          log.warn(`Unable to find transfer of about ${dart} DAI`);
        }
      }

    ////////////////////////////////////////
    // MCD Pot
    } else if (smeq(address, potAddress)) {
      const logNote = parseLogNote(potInterface, txLog);
      if (!logNote.name) continue;
      log.debug(`Found Pot call ${txLog.topics[0].substring(0,10)}: ${logNote.name}(${
        logNote.args.map(a => a.length > 16 ? a.substring(0, 18) + ".." : a)
      })`);

      if (logNote.name === "join") {
        const wad = formatUnits(hexlify(stripZeros(txLog.topics[2])), 18);
        const transfer = tx.transfers.findIndex(t =>
          t.assetType === AssetTypes.DAI &&
          t.category === TransferCategories.Transfer &&
          quantitiesAreClose(t.quantity, wad, div(wad, "10"))
        );
        if (transfer >= 0) {
          tx.transfers[transfer].category = TransferCategories.Deposit;
          tx.description = `${getName(tx.transfers[transfer].from)} deposited ${
            round(tx.transfers[transfer].quantity)
          } DAI into DSR`;
        } else {
          log.warn(`Unable to find matching ${wad} DAI transfer for SDR deposit`);
        }

      } else if (logNote.name === "exit") {
        const wad = formatUnits(hexlify(stripZeros(txLog.topics[2])), 18);
        const transfer = tx.transfers.findIndex(t =>
          t.assetType === AssetTypes.DAI &&
          t.category === TransferCategories.Transfer &&
          quantitiesAreClose(t.quantity, wad, div(wad, "10"))
        );
        if (transfer >= 0) {
          tx.transfers[transfer].category = TransferCategories.Withdraw;
          tx.description = `${getName(tx.transfers[transfer].to)} withdrew ${
            round(tx.transfers[transfer].quantity)
          } DAI from DSR`;
        } else {
          log.warn(`Unable to find matching ${wad} DAI transfer for SDR deposit`);
        }

      }
    }
  }

  // log.debug(tx, `Done parsing ${source}`);
  return tx;
};
