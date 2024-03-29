import { formatUnits } from "@ethersproject/units";
import { Asset, Logger } from "@valuemachine/types";
import { math, valuesAreClose } from "@valuemachine/utils";

import { TransferCategories } from "../../../enums";
import { AddressBook, Transaction, Transfer } from "../../../types";
import { insertVenue } from "../../../utils";
import { Apps, Methods, Tokens } from "../../enums";
import { parseEvent } from "../../utils";
import { EvmMetadata, EvmTransaction } from "../../types";

import {
  compAddress,
  compoundV1Address,
  comptrollerAddress,
  cTokenAddresses,
  maximillionAddress,
} from "./addresses";

const appName = Apps.Compound;

const { Income, Internal, SwapIn, SwapOut, Borrow, Repay } = TransferCategories;

////////////////////////////////////////
/// Abis

const compoundV1Abi = [
  "event BorrowRepaid(address account, address asset, uint256 amount, uint256 startingBalance, uint256 newBalance)",
  "event BorrowTaken(address account, address asset, uint256 amount, uint256 startingBalance, uint256 borrowAmountWithFee, uint256 newBalance)",
  "event EquityWithdrawn(address asset, uint256 equityAvailableBefore, uint256 amount, address owner)",
  "event SupplyReceived(address account, address asset, uint256 amount, uint256 startingBalance, uint256 newBalance)",
  "event SupplyWithdrawn(address account, address asset, uint256 amount, uint256 startingBalance, uint256 newBalance)",
];

const comptrollerAbi = [
  "event ActionPaused(address cToken, string action, bool pauseState)",
  "event ActionPaused(string action, bool pauseState)",
  "event CompGranted(address recipient, uint256 amount)",
  "event CompSpeedUpdated(address indexed cToken, uint256 newSpeed)",
  "event ContributorCompSpeedUpdated(address indexed contributor, uint256 newSpeed)",
  "event DistributedBorrowerComp(address indexed cToken, address indexed borrower, uint256 compDelta, uint256 compBorrowIndex)",
  "event DistributedSupplierComp(address indexed cToken, address indexed supplier, uint256 compDelta, uint256 compSupplyIndex)",
  "event Failure(uint256 error, uint256 info, uint256 detail)",
  "event MarketEntered(address cToken, address account)",
  "event MarketExited(address cToken, address account)",
  "event MarketListed(address cToken)",
  "event NewBorrowCap(address indexed cToken, uint256 newBorrowCap)",
  "event NewBorrowCapGuardian(address oldBorrowCapGuardian, address newBorrowCapGuardian)",
  "event NewCloseFactor(uint256 oldCloseFactorMantissa, uint256 newCloseFactorMantissa)",
  "event NewCollateralFactor(address cToken, uint256 oldCollateralFactorMantissa, uint256 newCollateralFactorMantissa)",
  "event NewLiquidationIncentive(uint256 oldLiquidationIncentiveMantissa, uint256 newLiquidationIncentiveMantissa)",
  "event NewPauseGuardian(address oldPauseGuardian, address newPauseGuardian)",
  "event NewPriceOracle(address oldPriceOracle, address newPriceOracle)",
];

const cTokenAbi = [
  "event AccrueInterest(uint256 cashPrior, uint256 interestAccumulated, uint256 borrowIndex, uint256 totalBorrows)",
  "event AccrueInterest(uint256 interestAccumulated, uint256 borrowIndex, uint256 totalBorrows)",
  "event Approval(address indexed owner, address indexed spender, uint256 amount)",
  "event Borrow(address borrower, uint256 borrowAmount, uint256 accountBorrows, uint256 totalBorrows)",
  "event Mint(address minter, uint256 mintAmount, uint256 mintTokens)",
  "event Redeem(address redeemer, uint256 redeemAmount, uint256 redeemTokens)",
  "event RepayBorrow(address payer, address borrower, uint256 repayAmount, uint256 accountBorrows, uint256 totalBorrows)",
  "event ReservesAdded(address benefactor, uint256 addAmount, uint256 newTotalReserves)",
  "event ReservesReduced(address admin, uint256 reduceAmount, uint256 newTotalReserves)",
  "event Transfer(address indexed from, address indexed to, uint256 amount)",
];

////////////////////////////////////////
/// Parser

const associatedTransfer = (asset: string, amount: string) =>
  (transfer: Transfer): boolean =>
    transfer.asset === asset && valuesAreClose(transfer.amount, amount, math.div(amount, "100"));

const coreParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ name: `${appName}:${evmTx.hash.substring(0, 6)}` });
  const { getDecimals, getName, isSelf } = addressBook;

  // Hardcode decimals values for underlying assets w non-default values
  const getUnderlyingDecimals = (cToken: string): number => {
    switch (cToken) {
    case Tokens.cUSDC: return 6;
    case Tokens.cUSDT: return 6;
    case Tokens.cWBTC: return 8;
    case Tokens.cWBTCv2: return 8;
    default: return 18;
    }
  };

  for (const txLog of evmTx.logs) {
    const address = txLog.address;

    ////////////////////////////////////////
    // Compound V1
    if (address === compoundV1Address) {
      tx.apps.push(appName);
      const subsrc = `${appName}-v1`;
      const event = parseEvent(compoundV1Abi, txLog, evmMeta);
      log.info(`Found ${subsrc} ${event.name} event`);
      const amount = formatUnits(event.args.amount, getDecimals(event.args.asset));
      const asset = getName(event.args.asset) as Asset;
      const account = insertVenue(event.args.account, subsrc);

      if (event.name === "SupplyReceived") {
        const oldBal = formatUnits(event.args.startingBalance, getDecimals(event.args.asset));
        const newBal = formatUnits(event.args.newBalance, getDecimals(event.args.asset));
        log.debug(`Starting Balance: ${oldBal} | New Balance: ${newBal}`);
        const deposit = tx.transfers.find(associatedTransfer(asset, amount));
        if (deposit) {
          const balChange = math.sub(newBal, oldBal);
          const interest = math.sub(balChange, deposit.amount);
          log.debug(`Amount Deposited: ${deposit.amount} | Interest Acrued: ${interest}`);
          if (math.gt(interest, "0")) {
            tx.transfers.push({
              asset,
              category: Income,
              from: address,
              index: deposit.index - 1,
              amount: interest,
              to: account
            });
          }
          deposit.category = Internal;
          deposit.to = account;
          tx.method = Methods.Deposit;
        } else {
          log.warn(tx.transfers, `Can't find an associated deposit transfer`);
        }

      } else if (event.name === "SupplyWithdrawn") {
        const oldBal = formatUnits(event.args.startingBalance, getDecimals(event.args.asset));
        const newBal = formatUnits(event.args.newBalance, getDecimals(event.args.asset));
        log.debug(`Starting Balance: ${oldBal} | New Balance: ${newBal}`);
        const withdraw = tx.transfers.find(transfer =>
          isSelf(transfer.to) && transfer.asset === asset && transfer.amount === amount
        );
        if (withdraw) {
          const principal = math.sub(oldBal, newBal);
          const interest = math.sub(withdraw.amount, principal);
          log.debug(`Principal: ${principal} | Interest Acrued: ${interest}`);
          if (math.gt(interest, "0")) {
            tx.transfers.push({
              asset,
              category: Income,
              from: address,
              index: withdraw.index - 1,
              amount: interest,
              to: account
            });
          }
          withdraw.category = Internal;
          withdraw.from = account;
          tx.method = Methods.Withdraw;
        } else {
          log.warn(tx.transfers, `Can't find an incoming transfer of ${amount} ${asset}`);
        }

      } else if (event.name === "BorrowTaken") {
        const borrow = tx.transfers.find(associatedTransfer(asset, amount));
        if (borrow) {
          borrow.category = Borrow;
          borrow.from = account;
          tx.method = Methods.Borrow;
        } else {
          log.warn(tx.transfers, `Can't find an associated borrow transfer`);
        }

      } else if (event.name === "BorrowRepaid") {
        const repay = tx.transfers.find(associatedTransfer(asset, amount));
        if (repay) {
          repay.category = Repay;
          repay.to = account;
          tx.method = Methods.Repayment;
          const refund = tx.transfers.find(transfer =>
            transfer.asset === repay.asset &&
            isSelf(transfer.to) &&
            transfer.from === maximillionAddress
          );
          if (refund) {
            refund.category = TransferCategories.Refund;
            refund.index = "index" in refund ? refund.index : txLog.index;
          }
        } else {
          log.warn(tx.transfers, `Can't find an associated repay transfer`);
        }

      } else {
        log.debug(`Skipping ${subsrc} ${event.name} event`);
      }

    ////////////////////////////////////////
    // Compound V2: Comptroller
    } else if (comptrollerAddress === address) {
      const event = parseEvent(comptrollerAbi, txLog, evmMeta);
      if (event.name === "MarketEntered") {
        tx.apps.push(appName);
        tx.method = `${getName(event.args.cToken)} ${Methods.Registration}`;
          
      }

    ////////////////////////////////////////
    // Compound V2: COMP gov token
    } else if (compAddress === address) {
      const event = parseEvent(cTokenAbi, txLog, evmMeta);
      if (event.name === "Transfer") {
        if (isSelf(event.args.to) && event.args.from === comptrollerAddress) {
          tx.apps.push(appName);
          const amount = formatUnits(
            event.args.amount,
            getDecimals(address),
          );
          const income = tx.transfers.find(associatedTransfer(Tokens.COMP, amount));
          if (income) {
            income.category = Income;
            income.from = comptrollerAddress;
          } else {
            log.warn(`${event.name}: Can't find income of ${amount} COMP`);
          }
        }
      }

    ////////////////////////////////////////
    // Compound V2: cTokens
    } else if (cTokenAddresses.some(a => address === a.address)) {
      const event = parseEvent(cTokenAbi, txLog, evmMeta);
      if (!event.name) continue;
      tx.apps.push(appName);
      const cAsset = getName(address);
      const asset = cAsset.replace(/^c/, "");
      const decimals = getUnderlyingDecimals(cAsset);
      const cDecimals = getDecimals(address);

      // Deposit
      if (event.name === "Mint") {
        log.info(`Parsing ${cAsset} ${event.name} event`);
        const tokenAmt = formatUnits(event.args.mintAmount, decimals);
        const cTokenAmt = formatUnits(event.args.mintTokens, cDecimals);
        const swapOut = tx.transfers.find(associatedTransfer(asset, tokenAmt));
        const swapIn = tx.transfers.find(associatedTransfer(cAsset, cTokenAmt));
        if (!swapOut) {
          log.warn(`${event.name}: Can't find swapOut of ${tokenAmt} ${asset}`);
        } else if (!swapIn) {
          log.warn(`${event.name}: Can't find swapIn of ${cTokenAmt} ${cAsset}`);
        } else {
          swapOut.category = SwapOut;
          swapOut.to = address;
          swapIn.category = SwapIn;
          swapIn.from = address;
          tx.method = Methods.Deposit;
        }

      // Withdraw
      } else if (event.name === "Redeem") {
        log.info(`Parsing ${cAsset} ${event.name} event`);
        const tokenAmt = formatUnits(event.args.redeemAmount, decimals);
        const cTokenAmt = formatUnits(event.args.redeemTokens, cDecimals);
        const swapOut = tx.transfers.find(associatedTransfer(cAsset, cTokenAmt));
        const swapIn = tx.transfers.find(associatedTransfer(asset, tokenAmt));
        if (!swapOut) {
          log.warn(`${event.name}: Can't find swapOut of ${cTokenAmt} ${cAsset}`);
        } else if (!swapIn) {
          log.warn(`${event.name}: Can't find swapIn of ${tokenAmt} ${asset}`);
        } else {
          swapOut.category = SwapOut;
          swapOut.to = address;
          swapIn.category = SwapIn;
          swapIn.from = address;
          tx.method = Methods.Withdraw;
        }

      // Borrow
      } else if (event.name === "Borrow") {
        log.info(`Parsing ${cAsset} ${event.name} event`);
        const tokenAmt = formatUnits(event.args.borrowAmount, decimals);
        const borrow = tx.transfers.find(associatedTransfer(asset, tokenAmt));
        if (borrow) {
          borrow.category = Borrow;
          borrow.from = insertVenue(borrow.to, cAsset);
          borrow.index = "index" in borrow ? borrow.index : txLog.index;
        } else {
          log.warn(`${event.name}: Can't find repayment of ${tokenAmt} ${asset}`);
        }
        tx.method = Methods.Borrow;

      // Repay
      } else if (event.name === "RepayBorrow") {
        log.info(`Parsing ${cAsset} ${event.name} event`);
        const tokenAmt = formatUnits(event.args.repayAmount, decimals);
        const repay = tx.transfers.find(associatedTransfer(asset, tokenAmt));
        if (repay) {
          tx.method = Methods.Repayment;
          repay.category = Repay;
          repay.to = insertVenue(repay.from, cAsset);
          repay.index = repay.index || txLog.index;
          const refund = tx.transfers.find(transfer =>
            transfer.asset === repay.asset &&
            isSelf(transfer.to) &&
            transfer.from === maximillionAddress
          );
          if (refund) {
            refund.from = insertVenue(refund.to, cAsset);
            refund.category = TransferCategories.Refund;
            refund.index = "index" in refund ? refund.index : txLog.index + 1;
          }
        } else {
          log.warn(`${event.name}: Can't find repayment of ${tokenAmt} ${asset}`);
        }


      } else {
        log.debug(`Skipping ${appName} ${event.name} event`);
      }

    }
  }

  return tx;
};

export const parsers = { insert: [], modify: [coreParser] };
