import { formatUnits } from "@ethersproject/units";
import {
  AddressBook,
  Asset,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  Transfer,
  TransferCategories,
} from "@valuemachine/types";
import {
  math,
  insertVenue,
  valuesAreClose,
} from "@valuemachine/utils";

import { Apps, Tokens, Evms } from "../../enums";
import { parseEvent } from "../../utils";

import { addresses, defiAddresses } from "./addresses";

const appName = Apps.Aave;

const { SwapIn, SwapOut, Borrow, Repay } = TransferCategories;

////////////////////////////////////////
/// Abis

const lendingPoolAbi = [
  "event LiquidationCall(address indexed collateralAsset,address indexed debtAsset,address indexed user,uint256 debtToCover,uint256 liquidatedCollateralAmount,address liquidator,bool receiveAToken )",
  "event ReserveDataUpdated(address indexed reserve,uint256 liquidityRate,uint256 stableBorrowRate,uint256 variableBorrowRate,uint256 liquidityIndex,uint256 variableBorrowIndex )",
  "event ReserveUsedAsCollateralEnabled(address indexed reserve,address indexed user )",
  "event ReserveUsedAsCollateralDisabled(address indexed reserve,address indexed user )",
  "event Deposit(address indexed reserve,address user,address indexed onBehalfOf,uint256 amount,uint16 indexed referral )",
  "event Withdraw(address indexed reserve,address indexed user,address indexed to,uint256 amount )",
  "event Repay(address indexed reserve,address indexed user,address indexed repayer,uint256 amount )",
  "event Borrow(address indexed reserve,address user,address indexed onBehalfOf,uint256 amount,uint256 borrowRateMode,uint256 borrowRate,uint16 indexed referral )",
  "event FlashLoan(address indexed target,address indexed initiator,address indexed asset,uint256 amount,uint256 premium,uint16 referralCode )",
  "event RebalanceStableBorrowRate(address indexed reserve,address indexed user )",
  "event Swap(address indexed user,address indexed reserve,uint256 rateMode)",
];

const aaveStakeAbi = [
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event AssetConfigUpdated(address indexed asset, uint256 emission)",
  "event AssetIndexUpdated(address indexed asset, uint256 index )",
  "event Cooldown(address indexed user)",
  "event DelegateChanged(address indexed delegator,address indexed delegatee,uint8 delegationType )",
  "event DelegatedPowerChanged(address indexed user,uint256 amount,uint8 delegationType )",
  "event Redeem(address indexed from,address indexed to,uint256 amount)",
  "event RewardsAccrued(address user,uint256 amount)",
  "event RewardsClaimed(address indexed from,address indexed to,uint256 amount )",
  "event Staked(address indexed from,address indexed onBehalfOf,uint256 amount  )",
  "event Transfer(address indexed from,address indexed to,uint256 value )",
  "event UserIndexUpdated(address indexed user,address indexed asset,uint256 index )",
];

/*
const aTokenAbi = [
  "event Transfer(address from,address to,uint256 value )",
  "event Mint(address _to,uint256 _amount,uint256 _newTotalSupply )",
  "event Burn(address account,address burnAddress,uint256 tokens,uint256 time )",
  "event Approval(address owner,address spender,uint256 value )",
  "event Withdraw(address indexed provider, uint256 value, uint256 ts)",
];
*/

////////////////////////////////////////
/// Parser

const associatedTransfer = (asset: string, amount: string) =>
  (transfer: Transfer): boolean =>
    asset === transfer.asset &&
    valuesAreClose(transfer.amount, amount, math.div(amount, "100"));

const coreParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });
  const { getName, isSelf } = addressBook;

  const prefix = evmMeta.name === Evms.Ethereum ? "a"
    : evmMeta.name === Evms.Polygon ? "am"
    : "";

  const stkAAVEAddress = addresses.find(e => e.name === Tokens.stkAAVE)?.address;

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    const index = txLog.index;
    if (defiAddresses.some(e => e.address === address)) {
      tx.apps.push(appName);
      const event = parseEvent(lendingPoolAbi, txLog, evmMeta);
      if (!event.name) continue;

      if (event.name === "Deposit" && (isSelf(event.args.user) || isSelf(event.args.onBehalfOf))) {
        const asset = getName(event.args.reserve) as Asset;
        const amount = formatUnits(
          event.args.amount,
          addressBook.getDecimals(event.args.reserve),
        );
        log.info(`Parsing ${appName} ${event.name} event of ${amount} ${asset}`);
        const aAsset = `${prefix}${asset.replace(/^W/, "")}`;
        const aTokenAddress = addresses?.find(entry => entry.name === aAsset)?.address;
        const amount2 = formatUnits(
          event.args.amount,
          addressBook.getDecimals(aTokenAddress),
        );
        const swapOut = tx.transfers.find(associatedTransfer(asset, amount));
        const swapIn = tx.transfers.find(associatedTransfer(aAsset,amount2));
        if (!swapOut) {
          log.warn(`${event.name}: Can't find swapOut of ${amount} ${asset}`);
        } else if (!swapIn) {
          log.warn(`${event.name}: Can't find swapIn of ${amount2} ${aAsset}`);
        } else {
          swapOut.category = SwapOut;
          swapOut.to = address;
          swapIn.category = SwapIn;
          swapIn.from = address;
          swapIn.index = index;
          tx.method = "Deposit";
        }

      } else if (event.name === "Withdraw" && event.args.user === event.args.to) {
        const asset = getName(event.args.reserve) as Asset ;
        const amount = formatUnits(
          event.args.amount,
          addressBook.getDecimals(event.args.reserve),
        );
        log.info(`Parsing ${appName} ${event.name} event of ${amount} ${asset}`);
        const aAsset = `${prefix}${asset.replace(/^W/, "")}`;
        const aTokenAddress = addresses?.find(entry => entry.name === aAsset)?.address;
        const amount2 = formatUnits(
          event.args.amount,
          addressBook.getDecimals(aTokenAddress),
        );
        const swapOut = tx.transfers.find(associatedTransfer(aAsset, amount2));
        const swapIn = tx.transfers.find(associatedTransfer(asset,amount));

        if (!swapOut) {
          log.warn(`${event.name}: Can't find swapOut of ${amount} ${aAsset}`);
        } else if (!swapIn) {
          log.warn(`${event.name}: Can't find swapIn of ${amount} ${asset}`);
        } else {
          swapOut.category = SwapOut;
          swapOut.to = address;
          swapIn.category = SwapIn;
          swapIn.from = address;
          swapIn.index = index;
          tx.method = "Withdraw";
        }

      } else if (event.name === "Borrow" && (event.args.user === event.args.onBehalfOf) ) {
        const asset = getName(event.args.reserve) as Asset ;
        const amount = formatUnits(
          event.args.amount,
          addressBook.getDecimals(event.args.reserve),
        );
        log.info(`Parsing ${appName} ${event.name} event of ${amount} ${asset}`);
        const borrow = tx.transfers.find(associatedTransfer(asset, amount));
        if (borrow) {
          borrow.category = Borrow;
          borrow.from = insertVenue(borrow.to, appName);
        } else {
          log.warn(`${event.name}: Can't find borrow of ${amount} ${asset}`);
        }
        tx.method = "Borrow";

      } else if (event.name === "Repay"&& (event.args.user === event.args.repayer) ) {
        const asset = getName(event.args.reserve) as Asset ;
        const amount = formatUnits(
          event.args.amount,
          addressBook.getDecimals(event.args.reserve),
        );
        log.info(`Parsing ${appName} ${event.name} event of ${amount} ${asset}`);
        const repay = tx.transfers.find(associatedTransfer(asset, amount));
        if (repay) {
          repay.category = Repay;
          repay.to = insertVenue(repay.from, appName);
        } else {
          log.warn(`${event.name}: Can't find repayment of ${amount} ${asset}`);
        }
        tx.method = "Repay";

      } else {
        log.debug(`Skipping ${event.name} event`);
      }

    } else if (stkAAVEAddress === address) {
      tx.apps.push(appName);
      const event = parseEvent(aaveStakeAbi, txLog, evmMeta);
      if (event.name === "Staked" && (event.args.from === event.args.onBehalfOf) ) {
        const asset1 = Tokens.AAVE;
        const asset2 = Tokens.stkAAVE;
        const amount = formatUnits(
          event.args.amount,
          addressBook.getDecimals(address),
        );
        log.info(`Parsing ${appName} ${event.name} of ${amount} ${asset1}`);
        const swapOut = tx.transfers.find(associatedTransfer(asset1, amount));
        const swapIn = tx.transfers.find(associatedTransfer(asset2,amount));
        if (!swapOut) {
          log.warn(`${event.name}: Can't find swapOut of ${amount} ${asset1}`);
        } else if (!swapIn) {
          log.warn(`${event.name}: Can't find swapIn of ${amount} ${asset2}`);
        } else {
          swapOut.category = SwapOut;
          swapOut.to = address;
          swapIn.category = SwapIn;
          swapIn.from = address;
          swapIn.index = index;
          tx.method = "Deposit";
          log.debug(`${event.name}: for ${amount} ${asset1} has been processed`);
        }

      } else if (event.name === "Redeem" && (event.args.from === event.args.to)) {
        const asset1 = Tokens.AAVE;
        const asset2 = Tokens.stkAAVE;
        const amount = formatUnits(
          event.args.amount,
          addressBook.getDecimals(address),
        );
        log.info(`Parsing ${appName} ${event.name} of ${amount} ${asset2}`);
        const swapOut = tx.transfers.find(associatedTransfer(asset2, amount));
        const swapIn = tx.transfers.find(associatedTransfer(asset1,amount));
        if (!swapOut) {
          log.warn(`${event.name}: Can't find swapOut of ${amount} ${asset2}`);
        } else if (!swapIn) {
          log.warn(`${event.name}: Can't find swapIn of ${amount} ${asset1}`);
        } else {
          swapOut.category = SwapOut;
          swapOut.to = address;
          swapIn.category = SwapIn;
          swapIn.from = address;
          swapIn.index = index;
          tx.method = "Withdraw";
          log.debug(`${event.name}: for ${amount} ${asset1} has been processed`);
        }

      } else {
        log.debug(`Skipping ${event.name} event`);
      }
    }
  }

  return tx;
};

export const parsers = { insert: [], modify: [coreParser] };
