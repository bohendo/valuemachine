import { Interface } from "@ethersproject/abi";
import { getAddress } from "@ethersproject/address";
import { AddressZero } from "@ethersproject/constants";
import { formatUnits } from "@ethersproject/units";
import {
  AddressBook,
  AddressCategories,
  Assets,
  Asset,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransactionSources,
  Transfer,
  TransferCategories,
} from "@valuemachine/types";
import {
  div,
  gt,
  parseEvent,
  dedup,
  setAddressCategory,
  sub,
  valuesAreClose,
} from "@valuemachine/utils";

const source = TransactionSources.Compound;
const {
  COMP, cBAT, cCOMP, cDAI, cETH, cREP, cSAI, cUNI, cUSDC, cUSDT, cWBTC, cWBTCv2, cZRX
} = Assets;
const { Income, Deposit, Withdraw, SwapIn, SwapOut, Borrow, Repay } = TransferCategories;

////////////////////////////////////////
/// Addresses

const comptroller = "comptroller";
const compoundV1 = "compound-v1";

const machineryAddresses = [
  { name: compoundV1, address: "0x3fda67f7583380e67ef93072294a7fac882fd7e7" },
  { name: "maximillion", address: "0xf859a1ad94bcf445a406b892ef0d3082f4174088" },
  { name: comptroller, address: "0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b" },
].map(setAddressCategory(AddressCategories.Defi));

const cTokenAddresses = [
  { name: cBAT, address: "0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e" },
  { name: cCOMP, address: "0x70e36f6bf80a52b3b46b3af8e106cc0ed743e8e4" },
  { name: cDAI, address: "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643" },
  { name: cETH, address: "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5" },
  { name: cREP, address: "0x158079ee67fce2f58472a96584a73c7ab9ac95c1" },
  { name: cSAI, address: "0xf5dce57282a584d2746faf1593d3121fcac444dc" },
  { name: cUNI, address: "0x35a18000230da775cac24873d00ff85bccded550" },
  { name: cUSDC, address: "0x39aa39c021dfbae8fac545936693ac917d5e7563" },
  { name: cUSDT, address: "0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9" },
  { name: cWBTC, address: "0xc11b1268c1a384e55c48c2391d8d480264a3a7f4" },
  { name: cWBTCv2, address: "0xccf4429db6322d5c611ee964527d42e5d685dd6a" },
  { name: cZRX, address: "0xb3319f5d18bc0d84dd1b4825dcde5d5f7266d407" },
].map(setAddressCategory(AddressCategories.ERC20));

const govTokenAddresses = [
  { name: COMP, address: "0xc00e94cb662c3520282e6f5717214004a7f26888" },
].map(setAddressCategory(AddressCategories.ERC20));

export const compoundAddresses = [
  ...cTokenAddresses,
  ...govTokenAddresses,
  ...machineryAddresses,
];

const comptrollerAddress = compoundAddresses.find(e => e.name === comptroller).address;
const compoundV1Address = compoundAddresses.find(e => e.name === compoundV1).address;
const compAddress = compoundAddresses.find(e => e.name === COMP).address;

////////////////////////////////////////
/// Interfaces

const compoundV1Interface = new Interface([
  "event BorrowRepaid(address account, address asset, uint256 amount, uint256 startingBalance, uint256 newBalance)",
  "event BorrowTaken(address account, address asset, uint256 amount, uint256 startingBalance, uint256 borrowAmountWithFee, uint256 newBalance)",
  "event EquityWithdrawn(address asset, uint256 equityAvailableBefore, uint256 amount, address owner)",
  "event SupplyReceived(address account, address asset, uint256 amount, uint256 startingBalance, uint256 newBalance)",
  "event SupplyWithdrawn(address account, address asset, uint256 amount, uint256 startingBalance, uint256 newBalance)",
]);

const comptrollerInterface = new Interface([
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

const associatedTransfer = (asset: string, quantity: string) =>
  (transfer: Transfer): boolean =>
    transfer.asset === asset && valuesAreClose(transfer.quantity, quantity, div(quantity, "100"));

export const compoundParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${source}${evmTx.hash.substring(0, 6)}` });
  const getAccount = address => `evm:${evmMeta.id}:${getAddress(address)}`;
  const { getDecimals, getName, isSelf } = addressBook;

  // TODO: how could we not hardcode these again & also not introduce cyclic dependencies?
  const cTokenToTokenDecimals = (cToken: string): number => {
    switch (cToken) {
    case cBAT: return getDecimals("0x0d8775f648430679a709e98d2b0cb6250d2887ef");
    case cCOMP: return getDecimals(compAddress);
    case cDAI: return getDecimals("0x6b175474e89094c44da98b954eedeac495271d0f");
    case cETH: return getDecimals(AddressZero);
    case cREP: return getDecimals("0x1985365e9f78359a9b6ad760e32412f4a445e862"); // REP version 1
    case cSAI: return getDecimals("0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359");
    case cUNI: return getDecimals("0x1f9840a85d5af5bf1d1762f925bdaddc4201f984");
    case cUSDC: return getDecimals("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
    case cUSDT: return getDecimals("0xdac17f958d2ee523a2206206994597c13d831ec7");
    case cWBTC: return getDecimals("0x2260fac5e5542a773aa44fbcfedf7c193bc2c599");
    case cWBTCv2: return getDecimals("0x2260fac5e5542a773aa44fbcfedf7c193bc2c599");
    case cZRX: return getDecimals("0xe41d2489571d322189246dafa5ebde1f4699f498");
    default: return 18;
    }
  };

  if (compoundAddresses.some(e => e.address === evmTx.to)) {
    tx.sources = dedup([source, ...tx.sources]);
  }

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    const contract = getAccount(txLog.address);
    if (compoundAddresses.some(e => e.address === address)) {
      tx.sources = dedup([source, ...tx.sources]);
    }

    ////////////////////////////////////////
    // Compound V1
    if (address === compoundV1Address) {
      const subsrc = `${source}V1`;
      const event = parseEvent(compoundV1Interface, txLog);
      log.info(`Found ${subsrc} ${event.name} event`);
      const amount = formatUnits(event.args.amount, getDecimals(event.args.asset));
      const asset = getName(event.args.asset) as Asset;
      const account = `${source}-${event.args.account?.substring(0, 8)}`;

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
      const event = parseEvent(comptrollerInterface, txLog);
      if (event.name === "MarketEntered") {
        tx.method = `${getName(event.args.cToken)} market entry`;
          
      }

    ////////////////////////////////////////
    // Compound V2: COMP gov token
    } else if (compAddress === address) {
      const event = parseEvent(cTokenInterface, txLog);
      if (event.name === "Transfer") {
        if (isSelf(event.args.to) && event.args.from === comptrollerAddress) {
          const amount = formatUnits(
            event.args.amount,
            getDecimals(address),
          );
          const income = tx.transfers.find(associatedTransfer("COMP", amount));
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
      const event = parseEvent(cTokenInterface, txLog);
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
        log.debug(`Skipping ${source} ${event.name} event`);
      }

    }
  }

  // log.debug(tx, `Done parsing ${source}`);
  return tx;
};
