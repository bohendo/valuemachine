import { formatUnits } from "@ethersproject/units";
import {
  AddressBook,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";

import { parseEvent } from "../utils";

import { managerAddresses, relayerAddresses } from "./addresses";
import { apps } from "./enums";

const appName = apps.Argent;
const { SwapIn, SwapOut } = TransferCategories;

const makerManagerAddress = managerAddresses.find(e => e.name === "ArgentMakerManager")?.address;

////////////////////////////////////////
/// Abis

const makerManagerV1Abi = [
  "event TokenConverted(address indexed wallet, address srcToken, uint256 srcAmount, address destToken, uint256 destAmount)",
  "event TransactionExecuted(address indexed wallet, bool indexed success, bytes32 signedHash)",
  "event ModuleCreated(bytes32 name)",
  "event ModuleInitialised(address wallet)",
  "event InvestmentAdded(address indexed wallet, address token, uint256 invested, uint256 period)",
  "event InvestmentRemoved(address indexed wallet, address token, uint256 fraction)"
];

////////////////////////////////////////
/// Parser

const coreParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });
  const { getName, isSelf } = addressBook;

  if (relayerAddresses.some(entry => evmTx.from === entry.address)) {
    tx.apps.push(appName);
  }

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    if (address === makerManagerAddress) {
      const subsrc = `${appName} MakerManager`;
      const event = parseEvent(makerManagerV1Abi, txLog, evmMeta);
      if (!event.name) continue;
      if (!isSelf(event.args.wallet)) {
        log.debug(`Skipping ${appName} ${event.name} that doesn't involve us`);
      }
      tx.apps.push(appName);

      if (event.name === "TokenConverted") {
        const { destAmount, destToken, srcAmount, srcToken } = event.args;
        log.info(`Parsing ${subsrc} ${event.name}`);

        const inAsset = getName(destToken);
        const inAmt = formatUnits(destAmount, addressBook.getDecimals(destToken));
        const swapIn = tx.transfers.find(transfer =>
          isSelf(transfer.to) && transfer.asset === inAsset && transfer.amount === inAmt
        );
        if (swapIn) {
          swapIn.category = SwapIn;
        } else {
          log.warn(`Couldn't find a swap in of ${inAmt} ${inAsset} via ${subsrc}`);
        }

        const outAsset = getName(srcToken);
        const outAmt = formatUnits(srcAmount, addressBook.getDecimals(srcToken));
        const swapOut = tx.transfers.find(transfer =>
          isSelf(transfer.from) && transfer.asset === outAsset && transfer.amount === outAmt
        );
        if (swapOut) {
          swapOut.category = SwapOut;
        } else {
          log.warn(`Couldn't find a swap out of ${outAmt} ${outAsset} via ${subsrc}`);
        }

        tx.method = "Trade";
      } else {
        log.debug(`Skipping ${subsrc} event: ${event.name}`);
      }

    }
  }

  // log.debug(tx, `Done parsing ${appName}`);
  return tx;
};

export const parsers = { insert: [], modify: [coreParser] };
