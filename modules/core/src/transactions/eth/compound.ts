import { Interface } from "@ethersproject/abi";
import { formatUnits } from "@ethersproject/units";
import {
  AddressBook,
  AddressBookJson,
  AddressCategories,
  ChainData,
  EthTransaction,
  Logger,
  Transaction,
  TransactionSources,
  Transfer,
  TransferCategories,
} from "@finances/types";
import { math, sm, smeq } from "@finances/utils";

import { getUnique, parseEvent, quantitiesAreClose } from "../utils";

const { div, round } = math;

const source = TransactionSources.Compound;

////////////////////////////////////////
/// Addresses

const compoundV1Address = "0x3fda67f7583380e67ef93072294a7fac882fd7e7";
const maxiAddress = "0xf859a1ad94bcf445a406b892ef0d3082f4174088";

const machineryAddresses = [
  { name: "compound-v1", address: compoundV1Address },
  { name: "compound-maximillion", address: maxiAddress },
  { name: "compound-comptroller", address: "0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b" },
].map(row => ({ ...row, category: AddressCategories.Defi })) as AddressBookJson;

const cTokenAddresses = [
  { name: "cBAT", address: "0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e" },
  { name: "cCOMP", address: "0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4" },
  { name: "cDAI", address: "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643" },
  { name: "cETH", address: "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5" },
  { name: "cREP", address: "0x158079ee67fce2f58472a96584a73c7ab9ac95c1" },
  { name: "cSAI", address: "0xf5dce57282a584d2746faf1593d3121fcac444dc" },
  { name: "cUNI", address: "0x35a18000230da775cac24873d00ff85bccded550" },
  { name: "cUSDC", address: "0x39aa39c021dfbae8fac545936693ac917d5e7563" },
  { name: "cUSDT", address: "0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9" },
  { name: "cWBTC", address: "0xc11b1268c1a384e55c48c2391d8d480264a3a7f4" },
  { name: "cWBTCv2", address: "0xccf4429db6322d5c611ee964527d42e5d685dd6a" },
  { name: "cZRX", address: "0xb3319f5d18bc0d84dd1b4825dcde5d5f7266d407" },
].map(row => ({ ...row, category: AddressCategories.ERC20 })) as AddressBookJson;

const govTokenAddresses = [
  { name: "COMP", address: "0xc00e94cb662c3520282e6f5717214004a7f26888" },
].map(row => ({ ...row, category: AddressCategories.ERC20 })) as AddressBookJson;

export const compoundAddresses = [
  ...cTokenAddresses,
  ...govTokenAddresses,
  ...machineryAddresses,
] as AddressBookJson;

////////////////////////////////////////
/// Interfaces

const compoundV1Interface = new Interface([
  "event BorrowRepaid(address account, address asset, uint256 amount, uint256 startingBalance, uint256 newBalance)",
  "event BorrowTaken(address account, address asset, uint256 amount, uint256 startingBalance, uint256 borrowAmountWithFee, uint256 newBalance)",
  "event EquityWithdrawn(address asset, uint256 equityAvailableBefore, uint256 amount, address owner)",
  "event SupplyReceived(address account, address asset, uint256 amount, uint256 startingBalance, uint256 newBalance)",
  "event SupplyWithdrawn(address account, address asset, uint256 amount, uint256 startingBalance, uint256 newBalance)",
]);

const cTokenInterface = new Interface([
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
]);

////////////////////////////////////////
/// Parser

const cTokenDecimals = 8;

const associatedTransfer = (assetType: string, quantity: string) =>
  (transfer: Transfer): boolean =>
    smeq(transfer.assetType, assetType)
      && quantitiesAreClose(transfer.quantity, quantity, div(quantity, "100"));

export const compoundParser = (
  tx: Transaction,
  ethTx: EthTransaction,
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${source}${ethTx.hash.substring(0, 6)}` });
  const { getName } = addressBook;

  if (compoundAddresses.some(e => smeq(e.address, ethTx.to))) {
    tx.sources = getUnique([source, ...tx.sources]) as TransactionSources[];
  }

  for (const txLog of ethTx.logs) {
    const address = sm(txLog.address);
    if (compoundAddresses.some(e => smeq(e.address, address))) {
      tx.sources = getUnique([source, ...tx.sources]) as TransactionSources[];
    }

    ////////////////////////////////////////
    // Compound V1
    if (smeq(address, compoundV1Address)) {
      const event = parseEvent(compoundV1Interface, txLog);
      log.info(`Found ${source}V1 ${event.name} event`);
      const amount = formatUnits(
        event.args.amount,
        chainData.getTokenData(event.args.asset)?.decimals || 18,
      );
      const assetType = getName(event.args.asset);

      if (event.name === "SupplyReceived") {
        const deposit = tx.transfers.find(associatedTransfer(assetType, amount));
        if (deposit) {
          deposit.category = TransferCategories.Deposit;
        } else {
          log.warn(tx.transfers, `Can't find an associated deposit transfer`);
        }
        if (smeq(ethTx.to, address)) {
          tx.description = `${getName(ethTx.from)} deposited ${
            round(amount)
          } ${assetType} into ${source}V1`;
        }

      } else if (event.name === "SupplyWithdrawn") {
        const withdraw = tx.transfers.find(associatedTransfer(assetType, amount));
        if (withdraw) {
          withdraw.category = TransferCategories.Withdraw;
        } else {
          log.warn(tx.transfers, `Can't find a transfer of ${amount} ${assetType}`);
        }
        if (smeq(ethTx.to, address) || smeq(ethTx.to, maxiAddress)) {
          tx.description = `${getName(ethTx.from)} withdrew ${
            round(amount)
          } ${assetType} from ${source}V1`;
        }

      } else if (event.name === "BorrowTaken") {
        const borrow = tx.transfers.find(associatedTransfer(assetType, amount));
        if (borrow) {
          borrow.category = TransferCategories.Borrow;
        } else {
          log.warn(tx.transfers, `Can't find an associated borrow transfer`);
        }
        if (smeq(ethTx.to, address)) {
          tx.description = `${getName(ethTx.from)} borrowed ${
            round(amount)
          } ${assetType} from ${source}V1`;
        }

      } else if (event.name === "BorrowRepaid") {
        const repay = tx.transfers.find(associatedTransfer(assetType, amount));
        if (repay) {
          repay.category = TransferCategories.Repay;
        } else {
          log.warn(tx.transfers, `Can't find an associated repay transfer`);
        }
        if (smeq(ethTx.to, address) || smeq(ethTx.to, maxiAddress)) {
          tx.description = `${getName(ethTx.from)} repaid ${
            round(amount)
          } ${assetType} to ${source}V1`;
        }

      } else {
        log.debug(`Skipping ${source}V1 ${event.name} event`);
      }

    ////////////////////////////////////////
    // Compound V2: cTokens
    } else if (cTokenAddresses.some(a => smeq(address, a.address))) {
      const event = parseEvent(cTokenInterface, txLog);
      if (!event.name) continue;
      const assetType = getName(address).replace(/^c/, "");

      // Deposit
      if (event.name === "Mint") {
        log.info(`Parsing ${getName(address)} ${event.name} event`);
        const tokenAmt = formatUnits(
          event.args.mintAmount,
          chainData.getTokenData(assetType)?.decimals || 18,
        );
        const cTokenAmt = formatUnits(event.args.mintTokens, cTokenDecimals);
        const swapOut = tx.transfers.find(associatedTransfer(assetType, tokenAmt));
        if (swapOut) {
          swapOut.category = TransferCategories.SwapOut;
        } else {
          log.warn(`${event.name}: Can't find swapOut of ${tokenAmt} ${assetType}`);
        }
        const swapIn = tx.transfers.find(associatedTransfer(getName(address), cTokenAmt));
        if (swapIn) {
          swapIn.category = TransferCategories.SwapIn;
        } else {
          log.warn(`${event.name}: Can't find swapIn of ${cTokenAmt} ${getName(address)}`);
        }
        if (smeq(ethTx.to, address)) {
          tx.description = `${getName(ethTx.from)} deposited ${
            round(tokenAmt)
          } ${assetType} into ${source}`;
        }

      // Withdraw
      } else if (event.name === "Redeem") {
        log.info(`Parsing ${getName(address)} ${event.name} event`);
        const tokenAmt = formatUnits(
          event.args.redeemAmount,
          chainData.getTokenData(assetType)?.decimals || 18,
        );
        const cTokenAmt = formatUnits(event.args.redeemTokens, cTokenDecimals);
        const swapOut = tx.transfers.find(associatedTransfer(getName(address), cTokenAmt));
        if (swapOut) {
          swapOut.category = TransferCategories.SwapOut;
        } else {
          log.warn(`${event.name}: Can't find swapOut of ${cTokenAmt} ${getName(address)}`);
        }
        const swapIn = tx.transfers.find(associatedTransfer(assetType, tokenAmt));
        if (swapIn) {
          swapIn.category = TransferCategories.SwapIn;
        } else {
          log.warn(`${event.name}: Can't find swapIn of ${tokenAmt} ${assetType}`);
        }
        if (smeq(ethTx.to, address) || smeq(ethTx.to, maxiAddress)) {
          tx.description = `${getName(ethTx.from)} withdrew ${
            round(tokenAmt)
          } ${assetType} from ${source}`;
        }

      // Borrow
      } else if (event.name === "Borrow") {
        log.info(`Parsing ${getName(address)} ${event.name} event`);
        const tokenAmt = formatUnits(
          event.args.borrowAmount,
          chainData.getTokenData(assetType)?.decimals || 18,
        );
        const borrow = tx.transfers.find(associatedTransfer(assetType, tokenAmt));
        if (borrow) {
          borrow.category = TransferCategories.Borrow;
        } else {
          log.warn(`${event.name}: Can't find repayment of ${tokenAmt} ${assetType}`);
        }
        if (smeq(ethTx.to, address) || smeq(ethTx.to, maxiAddress)) {
          tx.description = `${getName(ethTx.from)} borrowed ${
            round(tokenAmt)
          } ${assetType} to ${getName(address)}`;
        }

      // Repay
      } else if (event.name === "RepayBorrow") {
        log.info(`Parsing ${getName(address)} ${event.name} event`);
        const tokenAmt = formatUnits(
          event.args.repayAmount,
          chainData.getTokenData(assetType)?.decimals || 18,
        );
        const repay = tx.transfers.find(associatedTransfer(assetType, tokenAmt));
        if (repay) {
          repay.category = TransferCategories.Repay;
        } else {
          log.warn(`${event.name}: Can't find repayment of ${tokenAmt} ${assetType}`);
        }
        if (smeq(ethTx.to, address) || smeq(ethTx.to, maxiAddress)) {
          tx.description = `${getName(ethTx.from)} repayed ${
            round(tokenAmt)
          } ${assetType} to ${getName(address)}`;
        }


      } else {
        log.debug(`Skipping ${source} ${event.name} event`);
      }

    }
  }

  // log.debug(tx, `Done parsing ${source}`);
  return tx;
};
