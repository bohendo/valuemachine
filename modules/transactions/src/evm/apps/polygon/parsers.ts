import { AddressZero } from "@ethersproject/constants";
import { formatUnits } from "@ethersproject/units";
import { Logger } from "@valuemachine/types";

import { TransferCategories } from "../../../enums";
import { AddressBook, Transaction, Transfer } from "../../../types";
import { EvmMetadata, EvmTransaction } from "../../types";
import { Apps, Assets, Tokens } from "../../enums";
import { getTransferCategory, parseEvent } from "../../utils";

import {
  zapBridgeAddress,
  plasmaBridgeAddress,
  flashWalletAddress,
} from "./addresses";

export const appName = Apps.Polygon;

const { ETH } = Assets;
const { WETH } = Tokens;

////////////////////////////////////////
/// Addresses

const plasmaBridgeAbi = [
  "event NewDepositBlock(address indexed owner, address indexed token, uint256 amountOrNFTId, uint256 depositBlockId)",
  "event MaxErc20DepositUpdate(uint256 indexed oldLimit, uint256 indexed newLimit)",
  "event ProxyUpdated(address indexed _new, address indexed _old)",
  "event OwnerUpdate(address _prevOwner, address _newOwner)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)"
];

const wethAbi = [
  "event Approval(address indexed from, address indexed to, uint amount)",
  "event Deposit(address indexed from, uint256 amount)",
  "event Transfer(address indexed from, address indexed to, uint amount)",
  "event Withdrawal(address indexed to, uint256 amount)",
];

export const coreParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: appName });
  const { getName, isToken, getDecimals } = addressBook;
  const addressZero = `${evmMeta.name}/${AddressZero}`;

  if (evmTx.to === zapBridgeAddress) {
    const account = evmTx.from;
    tx.apps.push(appName);
    tx.method = `Zap to Polygon`;
    log.info(`Parsing ${tx.method}`);

    // Get all token transfers (even non-self ones)
    const tokenTransfers = evmTx.logs
      .filter(txLog => isToken(txLog.address))
      .map((txLog): Transfer => {
        const address = txLog.address;
        const event = parseEvent(wethAbi, txLog, evmMeta);
        if (event.name === "Transfer") {
          const from = event.args.from === addressZero ? address
            : event.args.from === flashWalletAddress ? account
            : event.args.from;
          const to = event.args.to === addressZero ? address
            : event.args.to === flashWalletAddress ? account
            : event.args.to;
          return {
            asset: getName(address),
            category: getTransferCategory(from, to, addressBook),
            from,
            index: txLog.index,
            amount: formatUnits(event.args.amount, getDecimals(address)),
            to,
          };
        } else if (event.name === "Deposit") {
          const swapOut = tx.transfers.find(transfer =>
            transfer.amount === formatUnits(event.args.amount, 18)
            && transfer.asset === ETH
          );
          if (swapOut) {
            swapOut.category = TransferCategories.SwapOut;
            swapOut.index = txLog.index - 0.1;
            swapOut.to = WETH;
          }
          log.info(`Returning weth swapin`);
          return {
            asset: WETH,
            category: TransferCategories.SwapIn,
            from: WETH,
            index: txLog.index,
            amount: formatUnits(event.args.amount, getDecimals(address)),
            to: account,
          };
        } else {
          return null;
        }
      }).filter(t => !!t);

    // Log & add selfish transfers
    tokenTransfers.forEach(transfer => {
      log.info(`Found ${transfer.asset} transfer for ${
        transfer.amount
      } from ${getName(transfer.from)} to ${getName(transfer.to)}`);
      if (addressBook.isSelf(transfer.from) || addressBook.isSelf(transfer.to)) {
        tx.transfers.push(transfer);
      }
    });

    // parse bridge
    evmTx.logs
      .filter(txLog => txLog.address === plasmaBridgeAddress)
      .forEach(txLog => {
        const event = parseEvent(plasmaBridgeAbi, txLog, evmMeta);
        log.info(`Got plasma bridge event: ${event.name}`);
        if (event.name === "NewDepositBlock") {
          const amount = formatUnits(event.args.amountOrNFTId, getDecimals(event.args.token));
          const asset = getName(event.args.token);
          const deposit = tx.transfers.find(transfer =>
            transfer.from === event.args.owner
            && transfer.amount === amount
            && transfer.asset === asset
          );
          if (deposit) {
            deposit.category = TransferCategories.Internal;
            deposit.to = `Polygon/${event.args.owner.split("/").pop()}`;
          } else {
            log.warn(`Couldn't find a deposit of ${amount} ${asset}`);
          }
        }
      });

  // If not a zap bridge, then parse events normally
  } else {
    for (const txLog of evmTx.logs) {
      const address = txLog.address;
      if (address === plasmaBridgeAddress) {
        tx.apps.push(appName);
        const name = getName(address);
        const event = parseEvent(plasmaBridgeAbi, txLog, evmMeta);
        if (event?.name === "NewDepositBlock") {
          const amount = formatUnits(event.args.amountOrNFTId, getDecimals(event.args.token));
          const asset = getName(event.args.token);
          log.info(`Got a ${name} ${event.name}`);
          const deposit = tx.transfers.find(transfer =>
            transfer.asset === asset
            && transfer.amount === amount
            && addressBook.isSelf(transfer.from)
          );
          if (deposit) {
            deposit.category = TransferCategories.Internal;
            deposit.to = `Polygon/${event.args.owner.split("/").pop()}`;
            tx.method = "Plasma Bridge to Polygon";
          } else {
            log.warn(`Couldn't find deposit of ${amount} ${asset}`);
          }
        }
      }
    }
  }

  // log.debug(tx, `parsed polygon tx`);
  return tx;
};


export const parsers = { insert: [], modify: [coreParser] };
