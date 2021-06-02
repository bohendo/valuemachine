import { Interface } from "@ethersproject/abi";
import { formatUnits } from "@ethersproject/units";
import {
  AddressBook,
  AddressBookJson,
  AddressCategories,
  // Assets,
  ChainData,
  EthTransaction,
  Logger,
  Transaction,
  TransactionSources,
  TransferCategories,
} from "@finances/types";
import { math, sm, smeq } from "@finances/utils";

import { parseEvent, rmDups } from "../utils";

const { round } = math;
//const { ETH, WETH } = Assets;
const { SwapIn, SwapOut } = TransferCategories;
const source = TransactionSources.Argent;

////////////////////////////////////////
/// Addresses

// Find more manager addresses at https://github.com/argentlabs/argent-contracts/releases/tag/2.1
const makerManagerAddress = "0x7557f4199aa99e5396330bac3b7bdaa262cb1913";

const relayerAddresses = [
  { name: "argent-relayer", address: "0xdd5a1c148ca114af2f4ebc639ce21fed4730a608" },
  { name: "argent-relayer", address: "0x0385b3f162a0e001b60ecb84d3cb06199d78f666" },
  { name: "argent-relayer", address: "0xf27696c8bca7d54d696189085ae1283f59342fa6" },
].map(row => ({ ...row, category: AddressCategories.Defi })) as AddressBookJson;

const managerAddresses = [
  { name: "argent-maker", address: makerManagerAddress },
].map(row => ({ ...row, category: AddressCategories.Defi })) as AddressBookJson;

export const argentAddresses = [
  ...relayerAddresses,
  ...managerAddresses,
];

////////////////////////////////////////
/// Interfaces

const makerManagerV1Interface = new Interface([
  "event TokenConverted(address indexed wallet, address srcToken, uint256 srcAmount, address destToken, uint256 destAmount)",
  "event TransactionExecuted(address indexed wallet, bool indexed success, bytes32 signedHash)",
  "event ModuleCreated(bytes32 name)",
  "event ModuleInitialised(address wallet)",
  "event InvestmentAdded(address indexed wallet, address token, uint256 invested, uint256 period)",
  "event InvestmentRemoved(address indexed wallet, address token, uint256 fraction)"
]);

////////////////////////////////////////
/// Parser

export const argentParser = (
  tx: Transaction,
  ethTx: EthTransaction,
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${source}${ethTx.hash.substring(0, 6)}` });
  const { getName, isSelf } = addressBook;

  if (relayerAddresses.some(entry => smeq(ethTx.from, entry.address))) {
    tx.sources = rmDups([source, ...tx.sources]) as TransactionSources[];
  }

  for (const txLog of ethTx.logs) {
    const address = sm(txLog.address);
    if (smeq(address, makerManagerAddress)) {
      const subsrc = `${source} MakerManager`;
      const event = parseEvent(makerManagerV1Interface, txLog);
      if (!event.name) continue;
      if (!isSelf(event.args.wallet)) {
        log.debug(`Skipping ${source} ${event.name} that doesn't involve us`);
      }
      tx.sources = rmDups([source, ...tx.sources]) as TransactionSources[];

      if (event.name === "TokenConverted") {
        const { destAmount, destToken, srcAmount, srcToken } = event.args;
        log.info(`Parsing ${subsrc} ${event.name}`);

        const inAsset = getName(destToken);
        const inAmt = formatUnits(destAmount, chainData.getTokenData(destToken).decimals);
        const swapIn = tx.transfers.find(transfer =>
          isSelf(transfer.to) && transfer.asset === inAsset && transfer.quantity === inAmt
        );
        if (swapIn) {
          swapIn.category = SwapIn;
        } else {
          log.warn(`Couldn't find a swap in of ${inAmt} ${inAsset} via ${subsrc}`);
        }

        const outAsset = getName(srcToken);
        const outAmt = formatUnits(srcAmount, chainData.getTokenData(srcToken).decimals);
        const swapOut = tx.transfers.find(transfer =>
          isSelf(transfer.from) && transfer.asset === outAsset && transfer.quantity === outAmt
        );
        if (swapOut) {
          swapOut.category = SwapOut;
        } else {
          log.warn(`Couldn't find a swap out of ${outAmt} ${outAsset} via ${subsrc}`);
        }

        tx.description = `${getName(swapIn.to)} swapped ${
          round(swapOut.quantity)
        } ${swapOut.asset} for ${
          round(swapIn.quantity)
        } ${swapIn.asset} via ${subsrc}`;
      } else {
        log.debug(`Skipping ${subsrc} event: ${event.name}`);
      }

    }
  }

  // log.debug(tx, `Done parsing ${source}`);
  return tx;
};

