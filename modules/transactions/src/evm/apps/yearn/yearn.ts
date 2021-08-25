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

import { EvmAssets } from "../../enums";
import { parseEvent } from "../utils";

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
  case EvmAssets.y3Crv: return EvmAssets._3Crv;
  case EvmAssets.yBUSDv3: return EvmAssets.BUSD;
  case EvmAssets.yDAI: return EvmAssets.DAI;
  case EvmAssets.yDAIv2: return EvmAssets.DAI;
  case EvmAssets.yDAIv3: return EvmAssets.DAI;
  case EvmAssets.yGUSD: return EvmAssets.GUSD;
  case EvmAssets.ysUSDTv2: return EvmAssets.sUSDT;
  case EvmAssets.yTUSD: return EvmAssets.TUSD;
  case EvmAssets.yTUSDv2: return EvmAssets.TUSD;
  case EvmAssets.yUSDC: return EvmAssets.USDC;
  case EvmAssets.yUSDCv2: return EvmAssets.USDC;
  case EvmAssets.yUSDCv3: return EvmAssets.USDC;
  case EvmAssets.yUSDT: return EvmAssets.USDT;
  case EvmAssets.yUSDTv2: return EvmAssets.USDT;
  case EvmAssets.yUSDTv3: return EvmAssets.USDT;
  case EvmAssets.yv1INCH: return EvmAssets._1INCH;
  case EvmAssets.yvankrCRV: return EvmAssets.ankrCRV;
  case EvmAssets.yvcrvPlain3andSUSD: return EvmAssets.crvPlain3andSUSD;
  case EvmAssets.yvdusd3CRV: return EvmAssets.dusd3CRV;
  case EvmAssets.yveursCRV: return EvmAssets.eursCRV;
  case EvmAssets.yvgusd3CRV: return EvmAssets.gusd3CRV;
  case EvmAssets.yvhCRV: return EvmAssets.hCRV;
  case EvmAssets.yvhusd3CRV: return EvmAssets.husd3CRV;
  case EvmAssets.yvlinkCRV: return EvmAssets.linkCRV;
  case EvmAssets.yvmusd3CRV: return EvmAssets.musd3CRV;
  case EvmAssets.yvusdn3CRV: return EvmAssets.usdn3CRV;
  case EvmAssets.yvusdp3CRV: return EvmAssets.usdp3CRV;
  case EvmAssets.yvusdt3CRV: return EvmAssets.usdt3CRV;
  case EvmAssets.yvUSDT: return EvmAssets.USDT;
  case EvmAssets.yvust3CRV: return EvmAssets.ust3CRV;
  case EvmAssets.yvWBTC: return EvmAssets.WBTC;
  case EvmAssets.yvWETH: return EvmAssets.WETH;
  case EvmAssets.yvYFI: return EvmAssets.YFI;
  case EvmAssets.yWBTCv2: return EvmAssets.WBTC;
  case EvmAssets.yWETH: return EvmAssets.WETH;
  case EvmAssets.yyDAI_yUSDC_yUSDT_yBUSD: return EvmAssets.yDAI_yUSDC_yUSDT_yBUSD;
  case EvmAssets.yyDAI_yUSDC_yUSDT_yTUSD: return EvmAssets.yDAI_yUSDC_yUSDT_yTUSD;
  case EvmAssets.yYFI: return EvmAssets.YFI;
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
        const deposit = tx.transfers.find(t => t.asset === EvmAssets.YFI && t.to === govAddress);
        if (deposit) {
          deposit.category = Deposit;
          deposit.to = account;
          tx.method = "Deposit";
        } else {
          log.warn(`Can't find YFI deposit`);
        }

      } else if (event.name === "Withdrawn") {
        const account = insertVenue(event.args.user, `${appName}-Gov`);
        const withdraw = tx.transfers.find(t => t.asset === EvmAssets.YFI && t.from === govAddress);
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
