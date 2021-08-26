import { AddressZero } from "@ethersproject/constants";
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
  div,
  gt,
  insertVenue,
  sub,
  valuesAreClose,
} from "@valuemachine/utils";

import { parseEvent } from "../utils";

import { assets } from "./enums";
import { addresses, cTokenAddresses } from "./addresses";

export const appName = "Compound";

const { Income, Deposit, Withdraw, SwapIn, SwapOut, Borrow, Repay } = TransferCategories;

////////////////////////////////////////
/// Addresses

const comptrollerAddress = addresses.find(e => e.name === "comptroller").address;
const compoundV1Address = addresses.find(e => e.name === "compound-v1").address;
const compAddress = addresses.find(e => e.name === assets.COMP).address;

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

const associatedTransfer = (asset: string, quantity: string) =>
  (transfer: Transfer): boolean =>
    transfer.asset === asset && valuesAreClose(transfer.quantity, quantity, div(quantity, "100"));

export const coreParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });
  const { getDecimals, getName, isSelf } = addressBook;

  // TODO: how could we not hardcode these again & also not introduce cyclic dependencies?
  const cTokenToTokenDecimals = (cToken: string): number => {
    switch (cToken) {
    case assets.cBAT: return getDecimals("0x0d8775f648430679a709e98d2b0cb6250d2887ef");
    case assets.cCOMP: return getDecimals(compAddress);
    case assets.cDAI: return getDecimals("0x6b175474e89094c44da98b954eedeac495271d0f");
    case assets.cETH: return getDecimals(AddressZero);
    case assets.cREP: return getDecimals("0x1985365e9f78359a9b6ad760e32412f4a445e862");
    case assets.cSAI: return getDecimals("0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359");
    case assets.cUNI: return getDecimals("0x1f9840a85d5af5bf1d1762f925bdaddc4201f984");
    case assets.cUSDC: return getDecimals("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
    case assets.cUSDT: return getDecimals("0xdac17f958d2ee523a2206206994597c13d831ec7");
    case assets.cWBTC: return getDecimals("0x2260fac5e5542a773aa44fbcfedf7c193bc2c599");
    case assets.cWBTCv2: return getDecimals("0x2260fac5e5542a773aa44fbcfedf7c193bc2c599");
    case assets.cZRX: return getDecimals("0xe41d2489571d322189246dafa5ebde1f4699f498");
    default: return 18;
    }
  };

  if (addresses.some(e => e.address === evmTx.to)) {
    tx.apps.push(appName);
  }

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    const contract = txLog.address;
    if (addresses.some(e => e.address === address)) {
      tx.apps.push(appName);
    }

    ////////////////////////////////////////
    // Compound V1
    if (address === compoundV1Address) {
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
          const balChange = sub(newBal, oldBal);
          const interest = sub(balChange, deposit.quantity);
          log.debug(`Quantity Deposited: ${deposit.quantity} | Interest Acrued: ${interest}`);
          if (gt(interest, "0")) {
            tx.transfers.push({
              asset,
              category: Income,
              from: contract,
              index: deposit.index - 1,
              quantity: interest,
              to: account
            });
          }
          deposit.category = Deposit;
          deposit.to = account;
          tx.method = "Deposit";
        } else {
          log.warn(tx.transfers, `Can't find an associated deposit transfer`);
        }

      } else if (event.name === "SupplyWithdrawn") {
        const oldBal = formatUnits(event.args.startingBalance, getDecimals(event.args.asset));
        const newBal = formatUnits(event.args.newBalance, getDecimals(event.args.asset));
        log.debug(`Starting Balance: ${oldBal} | New Balance: ${newBal}`);
        const withdraw = tx.transfers.find(transfer =>
          isSelf(transfer.to) && transfer.asset === asset && transfer.quantity === amount
        );
        if (withdraw) {
          const principal = sub(oldBal, newBal);
          const interest = sub(withdraw.quantity, principal);
          log.debug(`Principal: ${principal} | Interest Acrued: ${interest}`);
          if (gt(interest, "0")) {
            tx.transfers.push({
              asset,
              category: Income,
              from: contract,
              index: withdraw.index - 1,
              quantity: interest,
              to: account
            });
          }
          withdraw.category = Withdraw;
          withdraw.from = account;
          tx.method = "Withdraw";
        } else {
          log.warn(tx.transfers, `Can't find an incoming transfer of ${amount} ${asset}`);
        }

      } else if (event.name === "BorrowTaken") {
        const borrow = tx.transfers.find(associatedTransfer(asset, amount));
        if (borrow) {
          borrow.category = Borrow;
          borrow.from = account;
          tx.method = "Borrow";
        } else {
          log.warn(tx.transfers, `Can't find an associated borrow transfer`);
        }

      } else if (event.name === "BorrowRepaid") {
        const repay = tx.transfers.find(associatedTransfer(asset, amount));
        if (repay) {
          repay.category = Repay;
          repay.to = account;
          tx.method = "Repayment";
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
        tx.method = `${getName(event.args.cToken)} market entry`;
          
      }

    ////////////////////////////////////////
    // Compound V2: COMP gov token
    } else if (compAddress === address) {
      const event = parseEvent(cTokenAbi, txLog, evmMeta);
      if (event.name === "Transfer") {
        if (isSelf(event.args.to) && event.args.from === comptrollerAddress) {
          const amount = formatUnits(
            event.args.amount,
            getDecimals(address),
          );
          const income = tx.transfers.find(associatedTransfer(assets.COMP, amount));
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
      const cAsset = getName(address);
      const asset = cAsset.replace(/^c/, "");
      const decimals = cTokenToTokenDecimals(address);
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
          swapOut.to = contract;
          swapIn.category = SwapIn;
          swapIn.from = contract;
          tx.method = "Deposit";
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
          swapOut.to = contract;
          swapIn.category = SwapIn;
          swapIn.from = contract;
          tx.method = "Withdraw";
        }

      // Borrow
      } else if (event.name === "Borrow") {
        log.info(`Parsing ${cAsset} ${event.name} event`);
        const tokenAmt = formatUnits(event.args.borrowAmount, decimals);
        const borrow = tx.transfers.find(associatedTransfer(asset, tokenAmt));
        if (borrow) {
          borrow.category = Borrow;
          borrow.from = contract; // should this be a non-address account?
        } else {
          log.warn(`${event.name}: Can't find repayment of ${tokenAmt} ${asset}`);
        }
        tx.method = "Borrow";

      // Repay
      } else if (event.name === "RepayBorrow") {
        log.info(`Parsing ${cAsset} ${event.name} event`);
        const tokenAmt = formatUnits(event.args.repayAmount, decimals);
        const repay = tx.transfers.find(associatedTransfer(asset, tokenAmt));
        if (repay) {
          repay.category = Repay;
          repay.to = contract; // should this be a non-address account?
          tx.method = "Repayment";
        } else {
          log.warn(`${event.name}: Can't find repayment of ${tokenAmt} ${asset}`);
        }


      } else {
        log.debug(`Skipping ${appName} ${event.name} event`);
      }

    }
  }

  // log.debug(tx, `Done parsing ${appName}`);
  return tx;
};