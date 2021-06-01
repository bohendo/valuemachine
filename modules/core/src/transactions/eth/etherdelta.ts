import { Interface } from "@ethersproject/abi";
import { AddressZero } from "@ethersproject/constants";
import { formatUnits } from "@ethersproject/units";
import {
  Address,
  AddressBook,
  AddressBookJson,
  AddressCategories,
  Assets,
  ChainData,
  EthTransaction,
  Logger,
  Transaction,
  TransactionSources,
  TransferCategories,
  TransferCategory,
} from "@finances/types";
import { math, sm, smeq } from "@finances/utils";

import { rmDups, parseEvent } from "../utils";

const { round } = math;
const { Expense, Deposit, Withdraw, SwapIn, SwapOut } = TransferCategories;

const source = TransactionSources.EtherDelta;

////////////////////////////////////////
/// Addresses

const etherdeltaAddress = "0x8d12a197cb00d4747a1fe03395095ce2a5cc6819";

// Simple, standalone tokens only. App-specific tokens can be found in that app's parser.
export const dexAddresses = [
  { name: TransactionSources.EtherDelta, address: etherdeltaAddress },
].map(row => ({ ...row, category: AddressCategories.Defi })) as AddressBookJson;

////////////////////////////////////////
/// ABIs

const etherdeltaInterface = new Interface([
  "event Order(address tokenGet, uint256 amountGet, address tokenGive, uint256 amountGive, uint256 expires, uint256 nonce, address user)",
  "event Cancel(address tokenGet, uint256 amountGet, address tokenGive, uint256 amountGive, uint256 expires, uint256 nonce, address user, uint8 v, bytes32 r, bytes32 s)",
  "event Trade(address tokenGet, uint256 amountGet, address tokenGive, uint256 amountGive, address get, address give)",
  "event Deposit(address token, address user, uint256 amount, uint256 balance)",
  "event Withdraw(address token, address user, uint256 amount, uint256 balance)"
]);

////////////////////////////////////////
/// Parser

export const etherdeltaParser = (
  tx: Transaction,
  ethTx: EthTransaction,
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${source}${ethTx.hash.substring(0, 6)}` });
  const { getName, isSelf } = addressBook;

  const getAsset = (address: Address): Assets => {
    if (address === AddressZero) return Assets.ETH;
    else return getName(address);
  };

  for (const txLog of ethTx.logs) {
    const address = sm(txLog.address);
    const index = txLog.index || 1;
    // Only parse known, ERC20 compliant tokens
    if (smeq(address, etherdeltaAddress)) {
      const event = parseEvent(etherdeltaInterface, txLog);
      if (!event.name) continue;
      // Skip transfers that don't concern self accounts
      if (!isSelf(event.args.user)) {
        log.debug(`Skipping ${source} ${event.name} that doesn't involve us`);
        continue;
      }
      tx.sources = rmDups([source, ...tx.sources]) as TransactionSources[];

      if (event.name === "Deposit" || event.name === "Withdraw") {
        const asset = getAsset(event.args.token);
        const quantity = formatUnits(
          event.args.amount,
          chainData.getTokenData(event.args.token)?.decimals || 18,
        );
        const transfer = tx.transfers.find(transfer =>
          ([Deposit, Expense] as TransferCategory[]).includes(transfer.category)
          && transfer.asset === asset
          && transfer.quantity === quantity
        );
        if (transfer) {
          if (event.name === "Deposit") {
            transfer.category = Deposit;
            transfer.to = source;
          } else {
            transfer.category = Withdraw;
            transfer.from = source;
          }
          tx.description = `${getName(ethTx.from)} deposited ${
            round(quantity, 4)
          } ${asset} into ${source}`;
        } else {
          log.warn(`Unable to find a ${source} transfer of ${quantity} ${asset}`);
        }

      // "event Trade(
        // address tokenGet,
        // uint256 amountGet,
        // address tokenGive,
        // uint256 amountGive,
        // address get,
        // address give,
      // )",
      } else if (event.name === "Trade") {
        tx.transfers.push({
          asset: getAsset(event.args.tokenGive),
          category: SwapOut,
          from: source,
          index,
          quantity: formatUnits(
            event.args.amountGive,
            chainData.getTokenData(event.args.tokenGive)?.decimals || 18,
          ),
          to:  `${source}-exchange`,
        });
        tx.transfers.push({
          asset: getAsset(event.args.tokenGet),
          category: SwapIn,
          from:  `${source}-exchange`,
          index,
          quantity: formatUnits(
            event.args.amountGet,
            chainData.getTokenData(event.args.tokenGet)?.decimals || 18,
          ),
          to: source,
        });

      } else {
        log.warn(event, `Skipping ${source} ${event.name} event bc idk how to handle it`);
      }

    }
  }

  // log.debug(tx, `Done parsing ${source}`);
  return tx;
};

