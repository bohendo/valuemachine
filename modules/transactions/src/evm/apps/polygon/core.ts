import { AddressZero } from "@ethersproject/constants";
import { formatUnits } from "@ethersproject/units";
import {
  AddressBook,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  Transfer,
  TransferCategories,
} from "@valuemachine/types";

import { EvmAssets } from "../../enums";
import { parseEvent } from "../utils";

import { addresses } from "./addresses";
import { apps } from "./enums";

export const appName = apps.Polygon;

const { ETH, WETH } = EvmAssets;

////////////////////////////////////////
/// Addresses

const ZapperPolygonBridge = "ZapperPolygonBridge";
const PlasmaBridge = "PlasmaBridge";

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

  if (getName(evmTx.to) === ZapperPolygonBridge) {
    const account = evmTx.from;
    tx.apps.push(appName);
    tx.method = `Zap to Polygon`;
    log.info(`Parsing ${tx.method}`);

    // Get all erc20 transfers (even non-self ones)
    const erc20Transfers = evmTx.logs
      .filter(txLog => isToken(txLog.address))
      .map((txLog): Transfer => {
        const address = txLog.address;
        const event = parseEvent(wethAbi, txLog, evmMeta);
        if (event.name === "Transfer") {
          return {
            asset: getName(address),
            category: TransferCategories.Unknown,
            from: event.args.from === addressZero ? address : event.args.from,
            index: txLog.index,
            amount: formatUnits(event.args.amount, getDecimals(address)),
            to: event.args.to === addressZero ? address : event.args.to,
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

    // Log transfers
    erc20Transfers.forEach(transfer => {
      log.info(`Found ${transfer.asset} transfer for ${
        transfer.amount
      } from ${getName(transfer.from)} to ${getName(transfer.to)}`);
    });

    // Parse Weth
    erc20Transfers.forEach(transfer => {
      if (getName(transfer.from) === WETH) {
        tx.transfers.push(transfer);
        log.info(`ZAP Found weth swap in of ${
          transfer.amount
        } ${transfer.asset} from ${getName(transfer.from)}`);
      }
    });

    // Parse Uniswap
    erc20Transfers.forEach(transfer => {
      const [to, from] = [getName(transfer.to), getName(transfer.from)];
      if (to.startsWith("UniV2")) {
        transfer.from = account;
        transfer.category = TransferCategories.SwapOut;
        tx.transfers.push(transfer);
        log.info(`ZAP Found swap out of ${
          transfer.amount
        } ${transfer.asset} from ${getName(transfer.from)}`);
      } else if (from.startsWith("UniV2")) {
        transfer.to = account;
        transfer.category = TransferCategories.SwapIn;
        tx.transfers.push(transfer);
        log.info(`ZAP Found swap in of ${
          transfer.amount
        } ${transfer.asset} to ${getName(transfer.to)}`);
      }
    });

    // parse 0x
    erc20Transfers.forEach(transfer => {
      const [to, from] = [getName(transfer.to), getName(transfer.from)];
      if (to.startsWith("ZeroEx")) {
        transfer.from = account;
        transfer.category = TransferCategories.SwapOut;
        tx.transfers.push(transfer);
        log.info(`ZAP Found swap out of ${
          transfer.amount
        } ${transfer.asset} from ${getName(transfer.from)}`);
      } else if (from.startsWith("ZeroEx")) {
        transfer.to = account;
        transfer.category = TransferCategories.SwapIn;
        tx.transfers.push(transfer);
        log.info(`ZAP Found swap in of ${
          transfer.amount
        } ${transfer.asset} to ${getName(transfer.to)}`);
      }
    });

    // parse bridge?
    evmTx.logs
      .filter(txLog => getName(txLog.address) === PlasmaBridge) 
      .forEach(txLog => {
        const event = parseEvent(plasmaBridgeAbi, txLog, evmMeta);
        log.info(`Got plasma bridge event: ${event.name}`);
        if (event.name === "NewDepositBlock") {
          tx.transfers.push({
            asset: getName(event.args.token),
            category: TransferCategories.Internal,
            from: event.args.owner,
            index: txLog.index,
            amount: formatUnits(event.args.amountOrNFTId, getDecimals(event.args.token)),
            to: `Polygon/${event.args.owner.split("/").pop()}`,
          });
        }
      });

  // If not a zap bridge, then parse events normally
  } else {
    for (const txLog of evmTx.logs) {
      const address = txLog.address;
      if (addresses.map(e => e.address).includes(address)) {
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

