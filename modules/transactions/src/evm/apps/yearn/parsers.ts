import { Asset, Logger } from "@valuemachine/types";

import { TransferCategories } from "../../../enums";
import { AddressBook, Transaction } from "../../../types";
import { EvmMetadata, EvmTransaction } from "../../types";
import { insertVenue } from "../../../utils";
import { Apps, Methods, Tokens } from "../../enums";
import { parseEvent } from "../../utils";

import { govAddress, yTokenAddresses } from "./addresses";

const appName = Apps.Yearn;
const { Fee, Internal, SwapOut, SwapIn } = TransferCategories;

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

////////////////////////////////////////
/// Parser

const vaultToToken = (yAsset: string): Asset | undefined => {
  switch (yAsset) {
  case Tokens.y3Crv: return Tokens._3Crv;
  case Tokens.yBUSDv3: return Tokens.BUSD;
  case Tokens.yDAI: return Tokens.DAI;
  case Tokens.yDAIv2: return Tokens.DAI;
  case Tokens.yDAIv3: return Tokens.DAI;
  case Tokens.yGUSD: return Tokens.GUSD;
  case Tokens.ysUSDTv2: return Tokens.sUSDT;
  case Tokens.yTUSD: return Tokens.TUSD;
  case Tokens.yTUSDv2: return Tokens.TUSD;
  case Tokens.yUSDC: return Tokens.USDC;
  case Tokens.yUSDCv2: return Tokens.USDC;
  case Tokens.yUSDCv3: return Tokens.USDC;
  case Tokens.yUSDT: return Tokens.USDT;
  case Tokens.yUSDTv2: return Tokens.USDT;
  case Tokens.yUSDTv3: return Tokens.USDT;
  case Tokens.yv1INCH: return Tokens._1INCH;
  case Tokens.yvankrCRV: return Tokens.ankrCRV;
  case Tokens.yvcrvPlain3andSUSD: return Tokens.crvPlain3andSUSD;
  case Tokens.yvdusd3CRV: return Tokens.dusd3CRV;
  case Tokens.yveursCRV: return Tokens.eursCRV;
  case Tokens.yvgusd3CRV: return Tokens.gusd3CRV;
  case Tokens.yvhCRV: return Tokens.hCRV;
  case Tokens.yvhusd3CRV: return Tokens.husd3CRV;
  case Tokens.yvlinkCRV: return Tokens.linkCRV;
  case Tokens.yvmusd3CRV: return Tokens.musd3CRV;
  case Tokens.yvusdn3CRV: return Tokens.usdn3CRV;
  case Tokens.yvusdp3CRV: return Tokens.usdp3CRV;
  case Tokens.yvusdt3CRV: return Tokens.usdt3CRV;
  case Tokens.yvUSDT: return Tokens.USDT;
  case Tokens.yvust3CRV: return Tokens.ust3CRV;
  case Tokens.yvWBTC: return Tokens.WBTC;
  case Tokens.yvWETH: return Tokens.WETH;
  case Tokens.yvYFI: return Tokens.YFI;
  case Tokens.yWBTCv2: return Tokens.WBTC;
  case Tokens.yWETH: return Tokens.WETH;
  case Tokens.yyDAI_yUSDC_yUSDT_yBUSD: return Tokens.yDAI_yUSDC_yUSDT_yBUSD;
  case Tokens.yyDAI_yUSDC_yUSDT_yTUSD: return Tokens.yDAI_yUSDC_yUSDT_yTUSD;
  case Tokens.yYFI: return Tokens.YFI;
  default: return undefined;
  }
};

export const coreParser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ name: `${appName}:${evmTx.hash.substring(0, 6)}` });
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
      log.info(`Parsing yToken transfer of ${yTransfer.amount} ${yTransfer.asset}`);
      const transfer = tx.transfers.find(t => (
        t.category !== Fee
      ) && (
        t.asset === asset || t.asset.replace(/^W/, "") === asset.replace(/^W/, "")
      ) && (
        (isSelf(t.to) && isSelf(yTransfer.from)) ||
        (isSelf(t.from) && isSelf(yTransfer.to))
      ));
      if (!transfer) {
        log.warn(`Couldn't find a matching ${asset} transfer`);
      } else {
        if (isSelf(transfer.from) && isSelf(yTransfer.to)) { // deposit
          transfer.category = SwapOut;
          transfer.index = "index" in transfer ? transfer.index : txLog.index - 1;
          transfer.to = address;
          yTransfer.category = SwapIn;
          yTransfer.from = address;
          tx.method = Methods.Deposit;
        } else { // withdraw
          transfer.category = SwapIn;
          transfer.from = address;
          transfer.index = "index" in transfer ? transfer.index : txLog.index + 1;
          yTransfer.category = SwapOut;
          yTransfer.to = address;
          tx.method = Methods.Withdraw;
        }
      }

    } else if (address === govAddress) {
      tx.apps.push(appName);
      const event = parseEvent(yGovAbi, txLog, evmMeta);
      if (!event.name) continue;
      if (!addressBook.isSelf(event.args.user || event.args.voter)) continue;
      log.info(`Parsing yGov ${event.name} for user ${event.args.user || event.args.voter}`);
      if (event.name === "Staked") {
        const account = insertVenue(event.args.user, `${appName}-Gov`);
        const deposit = tx.transfers.find(t => t.asset === Tokens.YFI && t.to === govAddress);
        if (deposit) {
          deposit.category = Internal;
          deposit.to = account;
          tx.method = Methods.Deposit;
        } else {
          log.warn(`Can't find YFI deposit`);
        }

      } else if (event.name === "Withdrawn") {
        const account = insertVenue(event.args.user, `${appName}-Gov`);
        const withdraw = tx.transfers.find(t =>
          t.asset === Tokens.YFI && t.from === govAddress && t.to === event.args.user
        );
        if (withdraw) {
          withdraw.category = Internal;
          withdraw.from = account;
          tx.method = Methods.Withdraw;
        }
        const income = tx.transfers.find(t =>
          t.from === govAddress
          && isSelf(t.to)
          && t.asset === Tokens.yDAI_yUSDC_yUSDT_yTUSD
        );
        if (income) {
          income.category = TransferCategories.Income;
        }

      } else if (event.name === "RegisterVoter") {
        tx.method = `${Tokens.YFI} Voting ${Methods.Registration}`;
      }
    }
  }

  return tx;
};

export const parsers = { insert: [], modify: [coreParser] };
