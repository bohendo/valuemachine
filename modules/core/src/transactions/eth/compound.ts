import { Interface } from "@ethersproject/abi";
import { Contract } from "@ethersproject/contracts";
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

import { getUnique } from "../utils";

const source = TransactionSources.Compound;

export const compoundV1Addresses = [
  { name: "compound-v1", address: "0x3fda67f7583380e67ef93072294a7fac882fd7e7" },
];

export const compoundV2Addresses = [
  { name: "compound-maximillion", address: "0xf859a1ad94bcf445a406b892ef0d3082f4174088" },
  { name: "compound-comptroller", address: "0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b" },
];

// https://compound.finance/docs#networks
export const compoundV2Tokens = [
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
];

const compoundV1 = new Contract(compoundV1Addresses[0].address, [
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

export const compoundAddresses = [
  ...compoundV1Addresses,
  ...compoundV2Addresses,
  ...compoundV2Tokens,
].map(row => ({ ...row, category: AddressCategories.Compound })) as AddressBookJson;

const associatedTransfer = (assetType: string, quantity: string) =>
  (transfer: Transfer): boolean =>
    smeq(transfer.assetType, assetType) && math.eq(transfer.quantity, quantity);

export const parseCompound = (
  tx: Transaction,
  ethTx: EthTransaction,
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: source });
  const { getName } = addressBook;

  for (const txLog of ethTx.logs) {
    const address = sm(txLog.address);

    // Compound V1
    if (smeq(address, compoundV1.address)) {
      const event = Object.values(compoundV1.interface.events).find(e =>
        compoundV1.interface.getEventTopic(e) === txLog.topics[0]
      );
      if (!event) continue;
      log.info(`Found ${source}V1 ${event.name} event`);
      const args = compoundV1.interface.parseLog(txLog).args;
      const amount = formatUnits(args.amount, chainData.getTokenData(address).decimals);
      const assetType = getName(args.asset);

      if (event.name === "SupplyReceived") {
        const deposit = tx.transfers.findIndex(associatedTransfer(assetType, amount));
        if (deposit >= 0) {
          tx.transfers[deposit].category = TransferCategories.Deposit;
          tx.sources = getUnique([source, ...tx.sources]) as TransactionSources[];
          if (smeq(ethTx.to, compoundV1.address)) {
            tx.description = `${getName(ethTx.from)} deposited ${amount} ${assetType} into ${source}V1`;
          }
        } else {
          log.warn(tx.transfers, `Couldn't find an associated deposit transfer`);
        }

      } else if (event.name === "SupplyWithdrawn") {
        const withdraw = tx.transfers.findIndex(associatedTransfer(assetType, amount));
        if (withdraw >= 0) {
          tx.transfers[withdraw].category = TransferCategories.Withdraw;
          tx.sources = getUnique([source, ...tx.sources]) as TransactionSources[];
          if (smeq(ethTx.to, compoundV1.address)) {
            tx.description = `${getName(ethTx.from)} withdrew ${amount} ${assetType} from ${source}V1`;
          }
        } else {
          log.warn(tx.transfers, `Couldn't find a transfer of ${amount} ${assetType}`);
        }

      } else if (event.name === "BorrowTaken") {
        const borrow = tx.transfers.findIndex(associatedTransfer(assetType, amount));
        if (borrow >= 0) {
          tx.transfers[borrow].category = TransferCategories.Borrow;
          tx.sources = getUnique([source, ...tx.sources]) as TransactionSources[];
          if (smeq(ethTx.to, compoundV1.address)) {
            tx.description = `${getName(ethTx.from)} borrowed ${amount} ${assetType} from ${source}V1`;
          }
        } else {
          log.warn(tx.transfers, `Couldn't find an associated borrow transfer`);
        }

      } else if (event.name === "BorrowRepaid") {
        const repay = tx.transfers.findIndex(associatedTransfer(assetType, amount));
        if (repay >= 0) {
          tx.transfers[repay].category = TransferCategories.Repay;
          tx.sources = getUnique([source, ...tx.sources]) as TransactionSources[];
          if (smeq(ethTx.to, compoundV1.address)) {
            tx.description = `${getName(ethTx.from)} repaid ${amount} ${assetType} to ${source}V1`;
          }
        } else {
          log.warn(tx.transfers, `Couldn't find an associated repay transfer`);
        }

      } else if (event.name === "EquityWithdrawn") {
        log.debug(`Skipping ${event.name} event for ${source}V1`);
      } else {
        log.debug(`Unknown event for ${source}V1: ${event.name}`);
      }

    // Compound V2
    } else if (
      compoundV2Tokens.some(a => smeq(address, a.address))
    ) {
      log.info(`Found ${source}V2 event`);
      const event = Object.values(cTokenInterface.events).find(e =>
        cTokenInterface.getEventTopic(e) === txLog.topics[0]
      );
      if (!event) continue;
      log.info(`Found ${source}V2 ${event.name} event`);
      const args = cTokenInterface.parseLog(txLog).args;
      const amount = formatUnits(args.amount, chainData.getTokenData(address).decimals);
      const assetType = getName(args.asset);

      // If Mint then we deposited & are recieving cTokens in return
      if (event.name === "Mint") {
        log.info(`Deposited ${amount} ${assetType} into ${source}V1`);
        // TODO

      // If Burn then we withdrew & are returning our cTokens
      } else if (event.name === "Burn") {
        log.info(`Withdrew ${amount} ${assetType} from ${source}V1`);
        // TODO

      } else if (event.name === "AccrueInterest") {
        log.debug(`Skipping ${event.name} event for ${source}V1`);
      } else {
        log.warn(`Unknown event for ${source}V1: ${event.name}`);
      }

    }

  }

  // log.debug(tx, `Done parsing ${source}`);
  return tx;
};
