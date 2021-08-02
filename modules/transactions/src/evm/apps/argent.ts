import { Interface } from "@ethersproject/abi";
import { formatUnits } from "@ethersproject/units";
import {
  AddressBook,
  AddressCategories,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransactionSources,
  TransferCategories,
} from "@valuemachine/types";
import {
  setAddressCategory,
  parseEvent,
  dedup,
} from "@valuemachine/utils";

//const { ETH, WETH } = Assets;
const { SwapIn, SwapOut } = TransferCategories;
const source = TransactionSources.Argent;

////////////////////////////////////////
/// Addresses

// Find more manager addresses at https://github.com/argentlabs/argent-contracts/releases/tag/2.1
const makerManagerAddress = "0x7557f4199aa99e5396330bac3b7bdaa262cb1913";

const relayerAddresses = [
  { name: "argent-relayer", address: "evm:1:0xdd5a1c148ca114af2f4ebc639ce21fed4730a608" },
  { name: "argent-relayer", address: "evm:1:0x0385b3f162a0e001b60ecb84d3cb06199d78f666" },
  { name: "argent-relayer", address: "evm:1:0xf27696c8bca7d54d696189085ae1283f59342fa6" },
].map(setAddressCategory(AddressCategories.Defi));

const managerAddresses = [
  { name: "argent-maker", address: makerManagerAddress },
].map(setAddressCategory(AddressCategories.Defi));

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
  evmTx: EvmTransaction,
  _evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${source}${evmTx.hash.substring(0, 6)}` });
  const { getName, isSelf } = addressBook;

  if (relayerAddresses.some(entry => evmTx.from === entry.address)) {
    tx.sources = dedup([source, ...tx.sources]);
  }

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    if (address === makerManagerAddress) {
      const subsrc = `${source} MakerManager`;
      const event = parseEvent(makerManagerV1Interface, txLog);
      if (!event.name) continue;
      if (!isSelf(event.args.wallet)) {
        log.debug(`Skipping ${source} ${event.name} that doesn't involve us`);
      }
      tx.sources = dedup([source, ...tx.sources]);

      if (event.name === "TokenConverted") {
        const { destAmount, destToken, srcAmount, srcToken } = event.args;
        log.info(`Parsing ${subsrc} ${event.name}`);

        const inAsset = getName(destToken);
        const inAmt = formatUnits(destAmount, addressBook.getDecimals(destToken));
        const swapIn = tx.transfers.find(transfer =>
          isSelf(transfer.to) && transfer.asset === inAsset && transfer.quantity === inAmt
        );
        if (swapIn) {
          swapIn.category = SwapIn;
        } else {
          log.warn(`Couldn't find a swap in of ${inAmt} ${inAsset} via ${subsrc}`);
        }

        const outAsset = getName(srcToken);
        const outAmt = formatUnits(srcAmount, addressBook.getDecimals(srcToken));
        const swapOut = tx.transfers.find(transfer =>
          isSelf(transfer.from) && transfer.asset === outAsset && transfer.quantity === outAmt
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

  // log.debug(tx, `Done parsing ${source}`);
  return tx;
};

