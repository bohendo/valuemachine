import { Interface } from "@ethersproject/abi";
import { getAddress } from "@ethersproject/address";
import { formatUnits } from "@ethersproject/units";
import {
  AddressBook,
  AddressCategories,
  Assets,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransactionSources,
  TransferCategories,
} from "@valuemachine/types";
import {
  parseEvent,
  rmDups,
  setAddressCategory,
} from "@valuemachine/utils";

const { ETH, WETH } = Assets;
const { SwapIn, SwapOut } = TransferCategories;
const source = TransactionSources.Weth;

////////////////////////////////////////
/// Addresses

export const wethAddresses = [
  { name: WETH, address: "evm:1:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" },
].map(setAddressCategory(AddressCategories.ERC20));

const wethAddress = wethAddresses.find(e => e.name === WETH).address;

////////////////////////////////////////
/// Interfaces

const wethInterface = new Interface([
  "event Approval(address indexed s/rc, address indexed guy, uint256 wad)",
  "event Deposit(address indexed dst, uint256 wad)",
  "event Transfer(address indexed src, address indexed dst, uint256 wad)",
  "event Withdrawal(address indexed src, uint256 wad)",
]);

////////////////////////////////////////
/// Parser

export const wethParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${source}${evmTx.hash.substring(0, 6)}` });
  const getAccount = address => `evm:${evmMeta.id}:${getAddress(address)}`;
  const { getDecimals, isSelf } = addressBook;

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    const contract = getAccount(address);
    if (address === wethAddress) {
      const asset = WETH;
      const event = parseEvent(wethInterface, txLog);
      if (!event.name) continue;
      const amount = formatUnits(event.args.wad, getDecimals(address));
      const index = txLog.index || 1;

      if (event.name === "Deposit") {
        if (!isSelf(event.args.dst)) {
          log.debug(`Skipping ${asset} ${event.name} that doesn't involve us`);
          continue;
        } else {
          log.info(`Parsing ${source} ${event.name} of amount ${amount}`);
        }
        tx.sources = rmDups([source, ...tx.sources]);
        tx.transfers.push({
          asset,
          category: SwapIn,
          from: contract,
          index,
          quantity: amount,
          to: getAccount(event.args.dst),
        });
        const swapOut = tx.transfers.find(t =>
          t.asset === ETH && t.quantity === amount
          && isSelf(t.from) && t.to === contract
        );
        if (swapOut) {
          swapOut.category = SwapOut;
          swapOut.index = index - 0.1;
          if (evmTx.to === wethAddress) {
            tx.method = "Trade";
          }
          // If there's a same-value eth transfer to the swap recipient, index it before
          const transfer = tx.transfers.find(t =>
            t.asset === ETH && t.quantity === amount
            && t.to === swapOut.from
          );
          if (transfer) {
            transfer.index = index - 0.2;
          }
        } else {
          log.warn(`Couldn't find an eth call associated w deposit of ${amount} WETH`);
        }

      } else if (event.name === "Withdrawal") {
        if (!isSelf(event.args.src)) {
          log.debug(`Skipping ${asset} ${event.name} that doesn't involve us`);
          continue;
        } else {
          log.info(`Parsing ${source} ${event.name} of amount ${amount}`);
        }
        tx.sources = rmDups([source, ...tx.sources]);
        tx.transfers.push({
          asset,
          category: SwapOut,
          from: getAccount(event.args.src),
          index,
          quantity: amount,
          to: contract,
        });
        const swapIn = tx.transfers.find(t =>
          t.asset === ETH && t.quantity === amount
          && isSelf(t.to) && t.from === contract
        );
        if (swapIn) {
          swapIn.category = SwapIn;
          swapIn.index = index + 0.1;
          if (evmTx.to === wethAddress) {
            tx.method = "Trade";
          }
          // If there's a same-value eth transfer from the swap recipient, index it after
          const transfer = tx.transfers.find(t =>
            t.asset === ETH && t.quantity === amount
            && t.from === swapIn.to
          );
          if (transfer) {
            transfer.index = index + 0.2;
          }
        } else {
          log.warn(`Couldn't find an eth call associated w withdrawal of ${amount} WETH`);
        }

      } else if (event.name === "Transfer" || event.name === "Approval") {
        log.debug(`Skipping ${source} ${event.name} that was already processed`);
      } else {
        log.warn(`Unknown ${source} event`);
      }

    }
  }

  // log.debug(tx, `Done parsing ${source}`);
  return tx;
};
