import {
  AddressBook,
  Asset,
  EvmMetadata,
  EvmTransaction,
  Logger,
  Transaction,
  TransferCategories,
} from "@valuemachine/types";
import {
  assetsAreClose,
  insertVenue,
} from "@valuemachine/utils";

import { Tokens } from "../assets";
import { parseEvent } from "../utils";

import { assets } from "./assets";
import { govAddress, yTokenAddresses } from "./addresses";

export const appName = "Yearn";

const { Internal, Deposit, Withdraw, SwapOut, SwapIn } = TransferCategories;

////////////////////////////////////////
/// Abis

const yGovAbi = [
  "event NewProposal(uint256 id, address creator, uint256 start, uint256 duration, address executor)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
  "event ProposalFinished(uint256 indexed id, uint256 _for, uint256 _against, bool quorumReached)",
  "event RegisterVoter(address voter, uint256 votes, uint256 totalVotes)",
  "event RevokeVoter(address voter, uint256 votes, uint256 totalVotes)",
  "event RewardAdded(uint256 reward)",
  "event RewardPaid(address indexed user, uint256 reward)",
  "event Staked(address indexed user, uint256 amount)",
  "event Vote(uint256 indexed id, address indexed voter, bool vote, uint256 weight)",
  "event Withdrawn(address indexed user, uint256 amount)",
];

/*
const yVaultV1Abi = [
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

const yVaultV2Abi = [
  "event Transfer(address indexed sender, address indexed receiver, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event UpdateGovernance(address governance)",
  "event UpdateManagement(address management)",
  "event UpdateGuestList(address guestList)",
  "event UpdateRewards(address rewards)",
  "event UpdateDepositLimit(uint256 depositLimit)",
  "event UpdatePerformanceFee(uint256 performanceFee)",
  "event UpdateManagementFee(uint256 managementFee)",
  "event UpdateGuardian(address guard)",
  "event EmergencyShutdown(bool active)",
  "event UpdateWithdrawalQueue(address[20] queue)",
  "event StrategyUpdateDebtRatio(address indexed strategy, uint256 debtRatio)",
  "event StrategyUpdateMinDebtPerHarvest(address indexed strategy, uint256 minDebtPerHarvest)",
  "event StrategyUpdateMaxDebtPerHarvest(address indexed strategy, uint256 maxDebtPerHarvest)",
  "event StrategyUpdatePerformanceFee(address indexed strategy, uint256 performanceFee)",
  "event StrategyMigrated(address indexed oldVersion, address indexed newVersion)",
  "event StrategyRevoked(address indexed strategy)",
  "event StrategyRemovedFromQueue(address indexed strategy)",
  "event StrategyAddedToQueue(address indexed strategy)",
];
*/

////////////////////////////////////////
/// Parser

const vaultToToken = (yAsset: string): Asset | undefined => {
  switch (yAsset) {
  case assets.y3Crv: return Tokens._3Crv;
  case assets.yBUSDv3: return Tokens.BUSD;
  case assets.yDAI: return Tokens.DAI;
  case assets.yDAIv2: return Tokens.DAI;
  case assets.yDAIv3: return Tokens.DAI;
  case assets.yGUSD: return Tokens.GUSD;
  case assets.ysUSDTv2: return Tokens.sUSDT;
  case assets.yTUSD: return Tokens.TUSD;
  case assets.yTUSDv2: return Tokens.TUSD;
  case assets.yUSDC: return Tokens.USDC;
  case assets.yUSDCv2: return Tokens.USDC;
  case assets.yUSDCv3: return Tokens.USDC;
  case assets.yUSDT: return Tokens.USDT;
  case assets.yUSDTv2: return Tokens.USDT;
  case assets.yUSDTv3: return Tokens.USDT;
  case assets.yv1INCH: return Tokens._1INCH;
  case assets.yvankrCRV: return Tokens.ankrCRV;
  case assets.yvcrvPlain3andSUSD: return Tokens.crvPlain3andSUSD;
  case assets.yvdusd3CRV: return Tokens.dusd3CRV;
  case assets.yveursCRV: return Tokens.eursCRV;
  case assets.yvgusd3CRV: return Tokens.gusd3CRV;
  case assets.yvhCRV: return Tokens.hCRV;
  case assets.yvhusd3CRV: return Tokens.husd3CRV;
  case assets.yvlinkCRV: return Tokens.linkCRV;
  case assets.yvmusd3CRV: return Tokens.musd3CRV;
  case assets.yvusdn3CRV: return Tokens.usdn3CRV;
  case assets.yvusdp3CRV: return Tokens.usdp3CRV;
  case assets.yvusdt3CRV: return Tokens.usdt3CRV;
  case assets.yvUSDT: return Tokens.USDT;
  case assets.yvust3CRV: return Tokens.ust3CRV;
  case assets.yvWBTC: return Tokens.WBTC;
  case assets.yvWETH: return Tokens.WETH;
  case assets.yvYFI: return Tokens.YFI;
  case assets.yWBTCv2: return Tokens.WBTC;
  case assets.yWETH: return Tokens.WETH;
  case assets.yyDAI_yUSDC_yUSDT_yBUSD: return Tokens.yDAI_yUSDC_yUSDT_yBUSD;
  case assets.yyDAI_yUSDC_yUSDT_yTUSD: return Tokens.yDAI_yUSDC_yUSDT_yTUSD;
  case assets.yYFI: return Tokens.YFI;
  default: return undefined;
  }
};

export const yearnParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });
  const { getName, isSelf } = addressBook;

  for (const txLog of evmTx.logs) {
    const address = txLog.address;

    if (yTokenAddresses.some(yToken => yToken.address === address)) {
      tx.apps.push(appName);
      const yTransfer = tx.transfers.find(t => t.asset === getName(address));
      if (!yTransfer) {
        log.warn(`Can't find a transfer for ${getName(address)}`);
        continue;
      }
      const asset = vaultToToken(yTransfer.asset);
      if (!asset) {
        log.warn(`Couldn't find the asset associated with ${yTransfer.asset}`);
        continue;
      }
      log.info(`Parsing yToken transfer of ${yTransfer.quantity} ${yTransfer.asset}`);
      const transfer = tx.transfers.find(t =>
        t.category !== Internal
        && t.to !== evmMeta.name
        && assetsAreClose(t.asset, asset)
        && (
          (isSelf(t.to) && isSelf(yTransfer.from)) ||
          (isSelf(t.from) && isSelf(yTransfer.to))
        )
      );
      if (!transfer) {
        log.warn(yTransfer, `Couldn't find a matching ${asset} transfer`);
      } else {
        if (isSelf(transfer.from) && isSelf(yTransfer.to)) { // deposit
          transfer.category = SwapOut;
          transfer.index = transfer.index || txLog.index - 0.1;
          transfer.to = address;
          yTransfer.category = SwapIn;
          yTransfer.from = address;
          yTransfer.index = yTransfer.index || txLog.index + 0.1;
          tx.method = "Deposit";
        } else { // withdraw
          transfer.category = isSelf(transfer.to) ? SwapIn : SwapOut;
          transfer.from = address;
          transfer.index = transfer.index || txLog.index + 0.1;
          yTransfer.category = isSelf(yTransfer.to) ? SwapIn : SwapOut;
          yTransfer.index = yTransfer.index || txLog.index - 0.1;
          yTransfer.to = address;
          tx.method = "Withdraw";
        }
      }

    } else if (address === govAddress) {
      tx.apps.push(appName);
      const event = parseEvent(yGovAbi, txLog, evmMeta);
      if (!event.name) continue;
      log.info(`Parsing yGov ${event.name}`);
      if (event.name === "Staked") {
        const account = insertVenue(event.args.user, `${appName}-Gov`);
        const deposit = tx.transfers.find(t => t.asset === assets.YFI && t.to === govAddress);
        if (deposit) {
          deposit.category = Deposit;
          deposit.to = account;
          tx.method = "Deposit";
        } else {
          log.warn(`Can't find YFI deposit`);
        }

      } else if (event.name === "Withdrawn") {
        const account = insertVenue(event.args.user, `${appName}-Gov`);
        const withdraw = tx.transfers.find(t => t.asset === assets.YFI && t.from === govAddress);
        if (withdraw) {
          withdraw.category = Withdraw;
          withdraw.from = account;
          tx.method = "Withdraw";
        } else {
          // We're probably withdrawing from yYFI which uses yGov internally
          log.info(`Can't find YFI withdrawal`);
        }

      } else if (event.name === "RegisterVoter") {
        tx.method = "Register to vote";
      }
    }
  }

  // log.debug(tx, `Done parsing ${appName}`);
  return tx;
};
