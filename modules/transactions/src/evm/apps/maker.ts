import { Interface } from "@ethersproject/abi";
import { hexlify, stripZeros } from "@ethersproject/bytes";
import { AddressZero, HashZero } from "@ethersproject/constants";
import { formatUnits } from "@ethersproject/units";
import {
  AddressBook,
  AddressCategories,
  Assets,
  Asset,
  EvmTransaction,
  EvmTransactionLog,
  Logger,
  Transaction,
  TransactionSources,
  TransferCategories,
} from "@valuemachine/types";
import {
  abrv,
  abs,
  diffAsc,
  div,
  eq,
  gt,
  parseEvent,
  rmDups,
  round,
  setAddressCategory,
  toBN,
  valuesAreClose,
} from "@valuemachine/utils";

const { DAI, ETH, MKR, PETH, SAI, WETH } = Assets;
const { Expense, Income, Deposit, Withdraw, SwapIn, SwapOut, Borrow, Repay } = TransferCategories;

const source = TransactionSources.Maker;

////////////////////////////////////////
/// Addresses

const DSR = "DSR";
const tub = "scd-tub";
const vat = "mcd-vat";
const cage = "scd-cage";
const migration = "mcd-migration";
const pit = "scd-gen-pit";

const proxyAddresses = [
  { name: "maker-proxy-registry", address: "0x4678f0a6958e4d2bc4f1baf7bc52e8f3564f3fe4" },
  { name: "maker-proxy-factory", address: "0xa26e15c895efc0616177b7c1e7270a4c7d51c997" },
].map(setAddressCategory(AddressCategories.Defi));

const machineAddresses = [
  // Single-collateral DAI
  { name: cage, address: "0x9fdc15106da755f9ffd5b0ba9854cfb89602e0fd" },
  { name: pit, address: "0x69076e44a9c70a67d5b79d95795aba299083c275" },
  { name: "scd-tap", address: "0xbda109309f9fafa6dd6a9cb9f1df4085b27ee8ef" },
  { name: tub, address: "0x448a5065aebb8e423f0896e6c5d525c040f59af3" },
  { name: "scd-vox", address: "0x9b0f70df76165442ca6092939132bbaea77f2d7a" },
  // Multi-collateral DAI (deployed on Nov 18th 2019)
  { name: "mcd-dai-join", address: "0x9759a6ac90977b93b58547b4a71c78317f391a28" },
  { name: "mcd-gem-join", address: "0x2f0b23f53734252bda2277357e97e1517d6b042a" },
  { name: migration, address: "0xc73e0383f3aff3215e6f04b0331d58cecf0ab849" },
  { name: DSR, address: "0x197e90f9fad81970ba7976f33cbd77088e5d7cf7" }, // aka the Pot
  { name: "mcd-sai-join", address: "0xad37fd42185ba63009177058208dd1be4b136e6b" },
  { name: vat, address: "0x35d1b3f3d7966a1dfe207aa4514c12a259a0492b" },
  { name: "mcd-manager", address: "0x5ef30b9986345249bc32d8928b7ee64de9435e39" },
].map(setAddressCategory(AddressCategories.Defi));

const tokenAddresses = [
  { name: SAI, address: "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359" },
  { name: PETH, address: "0xf53ad2c6851052a81b42133467480961b2321c09" },
  { name: DAI, address: "0x6b175474e89094c44da98b954eedeac495271d0f" },
].map(setAddressCategory(AddressCategories.ERC20));

const govTokenAddresses = [
  { name: MKR, address: "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2" },
].map(setAddressCategory(AddressCategories.ERC20));

export const makerAddresses = [
  ...machineAddresses,
  ...proxyAddresses,
  ...tokenAddresses,
  ...govTokenAddresses,
];

const saiAddress = makerAddresses.find(e => e.name === SAI)?.address;
const tubAddress = makerAddresses.find(e => e.name.endsWith(tub))?.address;
const vatAddress = makerAddresses.find(e => e.name.endsWith(vat))?.address;
const dsrAddress = makerAddresses.find(e => e.name.endsWith(DSR))?.address;
const pethAddress = makerAddresses.find(e => e.name === PETH)?.address;
const cageAddress = makerAddresses.find(e => e.name.endsWith(cage))?.address;
const migrationAddress = makerAddresses.find(e => e.name.endsWith(migration))?.address;
const scdPitAddress = makerAddresses.find(e => e.name.endsWith(pit))?.address;

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

const cageInterface = new Interface([
  "event FreeCash(address sender, uint256 amount)",
  "function freeCash(uint256 wad) returns (uint256 cashoutBalance)",
  "function sai() view returns (address)",
  "function tap() view returns (address)",
  "function weth() view returns (address)"
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
  ethLog: EvmTransactionLog,
): { name: string; args: string[]; } => ({
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
  evmTx: EvmTransaction,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${source}${evmTx.hash.substring(0, 6)}` });
  const { getDecimals, getName, isSelf } = addressBook;
  // log.debug(tx, `Parsing in-progress tx`);

  const ethish = [WETH, ETH, PETH] as Asset[];

  if (machineAddresses.some(e => e.address === evmTx.to)) {
    tx.sources = rmDups([source, ...tx.sources]);
  }

  ////////////////////////////////////////
  // SCD -> MCD Migration
  if (evmTx.to === migrationAddress) {
    tx.sources = rmDups([source, ...tx.sources]);
    const swapOut = tx.transfers.find(t => t.asset === SAI);
    const swapIn = tx.transfers.find(t => t.asset === DAI);
    if (swapOut) {
      swapOut.category = SwapOut;
      swapOut.to = migrationAddress;
    } else {
      log.warn(`Can't find a SwapOut SAI transfer`);
    }
    if (swapIn) {
      swapIn.category = SwapIn;
      swapIn.from = migrationAddress;
    } else {
      log.warn(`Can't find an associated SwapIn DAI transfer`);
    }
    tx.method = "Migrate SAI to DAI";
    return tx;
  }

  ////////////////////////////////////////
  // PETH/SAI/DAI
  // Process token interactions before any of the rest of the maker machinery
  // So that they have all the transfers needed to search through
  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    const index = txLog.index || 1;
    if (machineAddresses.some(e => e.address === address)) {
      tx.sources = rmDups([source, ...tx.sources]);
    }
    if (tokenAddresses.some(e => e.address === address)) {
      const asset = getName(address) as Asset;
      const event = parseEvent(tokenInterface, txLog);
      if (!event.name) continue;
      const wad = formatUnits(event.args.wad, getDecimals(address));
      if (!isSelf(event.args.guy)) {
        log.debug(`Skipping ${asset} ${event.name} that doesn't involve us`);
        continue;
      }
      if (event.name === "Mint") {
        log.info(`Parsing ${asset} ${event.name} of ${wad}`);
        if (address === pethAddress) {
          const swapIn = {
            asset,
            category: SwapIn,
            from: tubAddress,
            index,
            quantity: wad,
            to: event.args.guy,
          };
          tx.transfers.push(swapIn);
        } else {
          tx.transfers.push({
            asset,
            category: Borrow,
            from: AddressZero, // placeholder, we'll set the real value while parsing Vat events
            index,
            quantity: wad,
            to: event.args.guy,
          });
        }
      } else if (event.name === "Burn") {
        log.info(`Parsing ${asset} ${event.name} of ${wad}`);
        if (address === pethAddress) {
          const swapOut = {
            asset,
            category: SwapOut,
            from: event.args.guy,
            index,
            quantity: wad,
            to: tubAddress,
          };
          tx.transfers.push(swapOut);
        } else {
          tx.transfers.push({
            asset,
            category: Repay,
            from: event.args.guy,
            index,
            quantity: wad,
            to: AddressZero, // placeholder, we'll set the real value while parsing Vat events
          });
        }
      } else if (["Approval", "Transfer"].includes(event.name)) {
        log.debug(`Skipping ${event.name} event from ${asset}`);
      } else {
        log.warn(`Unknown ${event.name} event from ${asset}`);
      }
    }
  }

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    const index = txLog.index || 1;

    ////////////////////////////////////////
    // Proxy Managers
    if (proxyAddresses.some(e => address === e.address)) {
      const event = parseEvent(proxyInterface, txLog);
      if (event?.name === "Created") {
        tx.method = "Proxy Creation";
      }

    ////////////////////////////////////////
    // MCD Vat aka Vault manager
    } else if (address === vatAddress) {
      const logNote = parseLogNote(vatInterface, txLog);
      if (!logNote.name) continue;
      log.debug(`Found Vat call ${txLog.topics[0].substring(0,10)}: ${logNote.name}(${
        logNote.args.map(a => a.length > 16 ? a.substring(0, 18) + ".." : a)
      })`);

      // Deposit Collateral
      if (logNote.name === "slip") {
        // NOTE: Hacky fix assumes that the joiner calls transfer immediately after slip
        // slip accepts ilk which is a bytes32 that maps to the token address, not super useful
        const assetAddress = evmTx.logs.find(l => l.index === index + 1).address;
        if (!assetAddress) {
          log.warn(`Vat.${logNote.name}: Can't find a token address for ilk ${logNote.args[0]}`);
          continue;
        }
        const vault = `${source}-${abrv(logNote.args[0])}`;
        const wad = formatUnits(
          toBN(logNote.args[2] || "0x00").fromTwos(256),
          getDecimals(assetAddress),
        );
        const asset = getName(assetAddress) as Asset;
        log.info(`Found a change in ${vault} collateral of about ${wad} ${asset}`);
        const transfer = tx.transfers.find(transfer =>
          (
            transfer.asset === asset || (
              ethish.includes(asset) && ethish.includes(transfer.asset)
            )
          ) && valuesAreClose(transfer.quantity, abs(wad), div(abs(wad), "10"))
        );
        if (transfer) {
          if (gt(wad, "0")) {
            const account = `${vault}-${abrv(transfer.from)}`;
            transfer.category = Deposit;
            transfer.to = account;
            tx.method = "Deposit";
          } else {
            const account = `${vault}-${abrv(transfer.to)}`;
            transfer.category = Withdraw;
            transfer.from = account;
            tx.method = "Withdraw";
          }
        } else {
          log.warn(`Vat.${logNote.name}: Can't find a ${asset} transfer of about ${wad}`);
        }

      // Borrow/Repay DAI
      } else if (logNote.name === "frob") {
        const vault = `${source}-${abrv(logNote.args[0])}`;
        const dart = formatUnits(toBN(logNote.args[5] || "0x00").fromTwos(256));
        if (eq(dart, "0")) {
          log.debug(`Vat.${logNote.name}: Skipping zero-value change in ${vault} debt`);
          continue;
        }
        log.info(`Found a change in ${vault} debt of about ${round(dart)} DAI`);
        const transfer = tx.transfers.find(transfer =>
          transfer.asset === DAI
          && valuesAreClose(transfer.quantity, abs(dart), div(abs(dart), "10"))
        );
        if (transfer) {
          if (gt(dart, "0")) {
            transfer.category = Borrow;
            transfer.from = `${vault}-${abrv(transfer.to)}`;
            tx.method = "Borrow";
          } else {
            transfer.category = Repay;
            transfer.to = `${vault}-${abrv(transfer.from)}`;
            tx.method = "Repayment";
          }
        } else {
          log.warn(`Vat.${logNote.name}: Can't find a DAI transfer of about ${dart}`);
        }
      }

    ////////////////////////////////////////
    // MCD Pot aka DSR
    } else if (address === dsrAddress) {
      const logNote = parseLogNote(potInterface, txLog);
      if (!logNote.name) continue;
      log.debug(`Found Pot call ${txLog.topics[0].substring(0,10)}: ${logNote.name}(${
        logNote.args.map(a => a.length > 16 ? a.substring(0, 18) + ".." : a)
      })`);

      if (logNote.name === "join") {
        const wad = formatUnits(hexlify(stripZeros(logNote.args[0])), 18);
        const deposit = tx.transfers.find(t =>
          t.asset === DAI &&
          t.category === Expense &&
          valuesAreClose(t.quantity, wad, div(wad, "10"))
        );
        if (deposit) {
          const account = `${source}-DSR-${abrv(deposit.from)}`;
          deposit.category = Deposit;
          deposit.to = account;
          tx.method = "Deposit";
        } else {
          log.warn(`Pot.${logNote.name}: Can't find a DAI expense of about ${wad}`);
        }

      } else if (logNote.name === "exit") {
        const wad = formatUnits(hexlify(stripZeros(logNote.args[0])), 18);
        const withdraw = tx.transfers.find(t =>
          t.asset === DAI &&
          t.category === Income &&
          valuesAreClose(t.quantity, wad, div(wad, "10"))
        );
        if (withdraw) {
          const account = `${source}-DSR-${abrv(withdraw.to)}`;
          withdraw.category = Withdraw;
          withdraw.from = account;
          tx.method = "Withdraw";
        } else {
          log.warn(`Pot.${logNote.name}: Can't find a DAI income of about ${wad}`);
        }
      }

    ////////////////////////////////////////
    // SCD Cage
    // During global settlement, the cage is used to redeem no-longer-stable-coins for collateral
    } else if (address === cageAddress) {
      const event = parseEvent(cageInterface, txLog);
      if (event?.name === "FreeCash") {
        const wad = formatUnits(event.args[1], 18);
        log.info(`Parsing SaiCage FreeCash event for ${wad} ETH`);
        const swapOut = tx.transfers.find(t =>
          t.asset === SAI
          && isSelf(t.from)
          && t.to === cageAddress
          && gt(t.quantity, "0")
        );
        if (swapOut) {
          swapOut.category = SwapOut;
          swapOut.to = address;
        } else {
          log.warn(`Cage.${event.name}: Can't find any SAI transfer`);
        }
        const swapIn = tx.transfers.find(t =>
          t.asset === ETH
          && isSelf(t.to)
          && t.from === cageAddress
          && valuesAreClose(t.quantity, wad, div(wad, "100"))
        );
        if (swapIn) {
          swapIn.category = SwapIn;
          swapIn.from = address;
          swapIn.index = swapOut.index + 0.1;
        } else {
          log.warn(`Cage.${event.name}: Can't find an ETH transfer of ${wad}`);
        }
        tx.method = "Redeem";
      }

    ////////////////////////////////////////
    // SCD Tub
    } else if (address === tubAddress) {
      const event = parseEvent(tubInterface, txLog);
      if (event?.name === "LogNewCup") {
        tx.method = `Create CDP-${toBN(event.args.cup)}`;
        continue;
      }
      const logNote = parseLogNote(tubInterface, txLog);
      if (!logNote.name || logNote.name === "open") continue;
      log.debug(`Found Tub call ${txLog.topics[0].substring(0,10)}: ${logNote.name}(${
        logNote.args.map(a => a.length > 16 ? a.substring(0, 18) + ".." : a)
      })`);

      if (logNote.name === "give") {
        tx.method = `Give CDP-${toBN(logNote.args[1])}`;

      } else if (logNote.name === "bite") {
        tx.method = `Bite CDP-${toBN(logNote.args[1])}`;

      } else if (logNote.name === "shut") {
        tx.method = `Shut CDP-${toBN(logNote.args[1])}`;

      // WETH -> PETH: Categorize WETH transfer as a swap out
      } else if (logNote.name === "join") {
        const wad = formatUnits(logNote.args[1], 18);
        // Get the WETH transfer with the quantity that's closest to the wad
        const swapOut = tx.transfers.filter(t =>
          t.asset === WETH
          && t.to !== ETH
          && ([Expense, SwapOut] as string[]).includes(t.category)
        ).sort(diffAsc(wad))[0];
        if (swapOut) {
          swapOut.category = SwapOut;
          swapOut.to = address;
          if (evmTx.to === tubAddress) {
            tx.method = "Trade";
          }
        } else if (evmTx.to === tubAddress) {
          // Not a problem if we're interacting via a proxy bc this wouldn't interact w self
          log.warn(`Tub.${logNote.name}: Can't find a WETH transfer of ${wad}`);
        }

      // PETH -> WETH: Categorize WETH transfer as a swap in
      } else if (logNote.name === "exit") {
        const wad = formatUnits(logNote.args[1], 18);
        // Get the WETH transfer with the quantity that's closest to the wad
        const swapIn = tx.transfers.filter(t =>
          t.asset === WETH
          && ([
            Income,
            SwapIn, // re-handle dup calls instead of logging warning
          ] as string[]).includes(t.category)
        ).sort(diffAsc(wad))[0];
        if (swapIn) {
          swapIn.category = SwapIn;
          swapIn.from = address;
          if (evmTx.to === tubAddress) {
            tx.method = "Trade";
          }
        } else if (evmTx.to === tubAddress) {
          // Not a problem if we're interacting via a proxy bc this wouldn't interact w self
          log.warn(`Tub.${logNote.name}: Can't find a WETH transfer of ${wad}`);
        }

      // PETH -> CDP: Categorize PETH transfer as deposit
      } else if (logNote.name === "lock") {
        const account = `${source}-CDP-${toBN(logNote.args[1])}`;
        const wad = formatUnits(hexlify(stripZeros(logNote.args[2])), 18);
        const transfer = tx.transfers.filter(t =>
          ethish.includes(t.asset)
          && t.to !== ETH
          && ([Expense, Deposit] as string[]).includes(t.category)
          && (tubAddress === t.to || isSelf(t.from))
        ).sort(diffAsc(wad))[0];
        if (transfer) {
          transfer.category = Deposit;
          transfer.to = account;
          tx.method = "Deposit";
        } else {
          log.warn(`Tub.${logNote.name}: Can't find a P/W/ETH transfer of about ${wad}`);
        }

      // PETH <- CDP: Categorize PETH transfer as withdraw
      } else if (logNote.name === "free") {
        const account = `${source}-CDP-${toBN(logNote.args[1])}`;
        const wad = formatUnits(hexlify(stripZeros(logNote.args[2])), 18);
        const transfers = tx.transfers.filter(t =>
          ethish.includes(t.asset)
          && ([Income, Withdraw] as string[]).includes(t.category)
          && (tubAddress === t.from || isSelf(t.to))
        ).sort(diffAsc(wad)).sort((t1, t2) =>
          // First try to match a PETH transfer
          (t1.asset === PETH && t2.asset !== PETH) ? -1
          : (t1.asset !== PETH && t2.asset === PETH) ? 1
          // Second try to match a WETH transfer
          : (t1.asset === WETH && t2.asset !== WETH) ? -1
          : (t1.asset !== WETH && t2.asset === WETH) ? 1
          // Last try to match an ETH transfer
          : (t1.asset === ETH && t2.asset !== ETH) ? -1
          : 1
        );
        const transfer = transfers[0];
        if (transfer) {
          transfer.category = Withdraw;
          transfer.from = account;
          tx.method = "Withdraw";
        } else {
          log.warn(`Tub.${logNote.name}: Can't find a PETH transfer of about ${wad}`);
        }

      // SAI <- CDP
      } else if (logNote.name === "draw") {
        const account = `${source}-CDP-${toBN(logNote.args[1])}`;
        const wad = formatUnits(hexlify(stripZeros(logNote.args[2])), 18);
        const borrow = tx.transfers.filter(t =>
          isSelf(t.to)
          && t.asset === SAI
          && ([Income, Borrow] as string[]).includes(t.category)
        ).sort(diffAsc(wad))[0];
        if (borrow) {
          borrow.category = Borrow;
          borrow.from = account;
          tx.method = "Borrow";
        } else if (!evmTx.logs.find(l =>
          l.index > index
          && l.address === saiAddress
          && parseEvent(tokenInterface, l).name === "Mint"
        )) {
          // Only warn if there is NOT an upcoming SAI mint evet
          log.warn(`Tub.${logNote.name}: Can't find a SAI transfer of ${wad}`);
        }

      // SAI -> CDP
      } else if (logNote.name === "wipe") {
        const account = `${source}-CDP-${toBN(logNote.args[1])}`;
        const wad = formatUnits(hexlify(stripZeros(logNote.args[2])), 18);
        const repay = tx.transfers.filter(t =>
          t.asset === SAI && ([Expense, Repay] as string[]).includes(t.category)
        ).sort(diffAsc(wad))[0];
        if (repay) {
          repay.category = Repay;
          repay.to = account;
          tx.method = "Repayment";
        } else if (!evmTx.logs.find(l =>
          l.index > index
          && l.address === saiAddress
          && parseEvent(tokenInterface, l).name === "Burn"
        )) {
          log.warn(`Tub.${logNote.name}: Can't find a SAI transfer of ${wad}`);
        }
        // Handle MKR fee (or find the stable-coins spent to buy MKR)
        // TODO: split repayment into two transfers if we repayed with one lump of DAI
        const feeAsset = [MKR, SAI] as Asset[];
        const fee = tx.transfers.find(t =>
          isSelf(t.from)
          && feeAsset.includes(t.asset)
          // Fee might be a SwapOut eg if we gave SAI to OasisDex to swap for MKR
          && ([Expense, SwapOut] as string[]).includes(t.category)
        );
        if (fee) {
          fee.category = Expense;
          fee.to = scdPitAddress;
        } else {
          log.warn(`Tub.${logNote.name}: Can't find a MKR/SAI fee`);
        }

      }
    }
  }

  // log.debug(tx, `Done parsing ${source}`);
  return tx;
};
