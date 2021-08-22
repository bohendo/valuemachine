import { formatUnits } from "@ethersproject/units";
import {
  AddressBook,
  AddressCategories,
  Asset,
  Assets,
  EvmMetadata,
  EvmTransaction,
  Guards,
  Logger,
  Transaction,
  TransactionSources,
  Transfer,
  TransferCategories,
} from "@valuemachine/types";
import {
  div,
  dedup,
  setAddressCategory,
  valuesAreClose,
  assetsAreClose,
} from "@valuemachine/utils";

import { parseEvent } from "../utils";

const name = "Aave";

const { Polygon, Ethereum } = Guards;
const source = TransactionSources.Aave;

const { SwapIn, SwapOut, Borrow, Repay } = TransferCategories;

//////////////////////////////
// Addresses
// https://docs.aave.com/developers/deployed-contracts/deployed-contracts

const erc20Addresses = [{
  address: `${Polygon}/0xD6DF932A45C0f255f85145f286eA0b292B21C90B`,
  name: Assets.AAVE,
}, {
  address: `${Ethereum}/0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9`,
  name: Assets.AAVE,
}, {
  address: `${Polygon}/0x1d2a0E5EC8E5bBDCA5CB219e649B565d8e5c3360`,
  name: Assets.amAAVE,
}, {
  address: `${Polygon}/0x27F8D03b3a2196956ED754baDc28D73be8830A6e`,
  name: Assets.amDAI,
}, {
  address: `${Polygon}/0x1a13F4Ca1d028320A707D99520AbFefca3998b7F`,
  name: Assets.amUSDC,
}, {
  address: `${Polygon}/0x60D55F02A771d515e077c9C2403a1ef324885CeC`,
  name: Assets.amUSDT,
}, {
  address: `${Polygon}/0x28424507fefb6f7f8E9D3860F56504E4e5f5f390`,
  name: Assets.amWETH,
}, {
  address: `${Polygon}/0x5c2ed810328349100A66B82b78a1791B101C9D61`,
  name: Assets.amWBTC,
}, {
  address: `${Polygon}/0x8dF3aad3a84da6b69A4DA8aeC3eA40d9091B2Ac4`,
  name: Assets.amMATIC,
}, {
  name: Assets.stkAAVE,
  address: `${Ethereum}/0x4da27a545c0c5B758a6BA100e3a049001de870f5`,
}, {
  name: Assets.aDAI,
  address: `${Ethereum}/0x028171bca77440897b824ca71d1c56cac55b68a3`,
}, {
  name: Assets.aAAVE,
  address: `${Ethereum}/0xffc97d72e13e01096502cb8eb52dee56f74dad7b`,
}, {
  name: Assets.aBAT,
  address: `${Ethereum}/0x05ec93c0365baaeabf7aeffb0972ea7ecdd39cf1`,
}, {
  address: `${Ethereum}:0x3Ed3B47Dd13EC9a98b44e6204A523E766B225811`,
  decimals: 6,
  name: Assets.aUSDT,
}, {
  address: `${Ethereum}:0x9ff58f4fFB29fA2266Ab25e75e2A8b3503311656`,
  decimals: 8,
  name: Assets.aWBTC,
}, {
  name: Assets.aWETH,
  address: `${Ethereum}/0x030bA81f1c18d280636F32af80b9AAd02Cf0854e`,
}, {
  name: Assets.aYFI,
  address: `${Ethereum}/0x5165d24277cD063F5ac44Efd447B27025e888f37`,
}, {
  name: Assets.aZRX,
  address: `${Ethereum}/0xDf7FF54aAcAcbFf42dfe29DD6144A69b629f8C9e`,
}, {
  name: Assets.aBUSD,
  address: `${Ethereum}/0xA361718326c15715591c299427c62086F69923D9`,
}, {
  name: Assets.aENJ,
  address: `${Ethereum}/0xaC6Df26a590F08dcC95D5a4705ae8abbc88509Ef`,
}, {
  name: Assets.aKNC,
  address: `${Ethereum}/0x39C6b3e42d6A679d7D776778Fe880BC9487C2EDA`,
}, {
  name: Assets.aLINK,
  address: `${Ethereum}/0xa06bC25B5805d5F8d82847D191Cb4Af5A3e873E0`,
}, {
  name: Assets.aMANA,
  address: `${Ethereum}/0xa685a61171bb30d4072B338c80Cb7b2c865c873E`,
}, {
  name: Assets.aMKR,
  address: `${Ethereum}/0xc713e5E149D5D0715DcD1c156a020976e7E56B88`,
}, {
  name: Assets.aREN,
  address: `${Ethereum}/0xCC12AbE4ff81c9378D670De1b57F8e0Dd228D77a`,
}, {
  name: Assets.aSNX,
  address: `${Ethereum}/0x35f6B052C598d933D69A4EEC4D04c73A191fE6c2`,
}, {
  name: Assets.aSUSD,
  address: `${Ethereum}/0x6C5024Cd4F8A59110119C56f8933403A539555EB`,
}, {
  name: Assets.aTUSD,
  address: `${Ethereum}/0x101cc05f4A51C0319f570d5E146a8C625198e636`,
}, {
  address: `${Ethereum}/0xBcca60bB61934080951369a648Fb03DF4F96263C`,
  decimals: 6,
  name: Assets.aUSDC,
}, {
  name: Assets.aCRV,
  address: `${Ethereum}/0x8dAE6Cb04688C62d939ed9B68d32Bc62e49970b1`,
}, {
  address: `${Ethereum}/0xD37EE7e4f452C6638c96536e68090De8cBcdb583`,
  decimals: 2,
  name: Assets.aGUSD,
}, {
  name: Assets.aBAL,
  address: `${Ethereum}/0x272F97b7a56a387aE942350bBC7Df5700f8a4576`,
}, {
  name: Assets.aXSUSHI,
  address: `${Ethereum}/0xF256CC7847E919FAc9B808cC216cAc87CCF2f47a`,
}, {
  name: Assets.aRENFIL,
  address: `${Ethereum}/0x514cd6756CCBe28772d4Cb81bC3156BA9d1744aa`,
}, {
  name: Assets.BUSD,
  address: `${Ethereum}/0x4Fabb145d64652a948d72533023f6E7A623C7C53`,
}, {
  name: Assets.ENJ,
  address: `${Ethereum}/0xF629cBd94d3791C9250152BD8dfBDF380E2a3B9c`,
}, {
  name: Assets.KNC,
  address: `${Ethereum}/0xdd974D5C2e2928deA5F71b9825b8b646686BD200`,
}, {
  name: Assets.LINK,
  address: `${Ethereum}/0x514910771AF9Ca656af840dff83E8264EcF986CA`,
}, {
  name: Assets.MANA,
  address: `${Ethereum}/0x0F5D2fB29fb7d3CFeE444a200298f468908cC942`,
}, {
  name: Assets.REN,
  address: `${Ethereum}/0x408e41876cCCDC0F92210600ef50372656052a38`,
}, {
  name: Assets.TUSD,
  address: `${Ethereum}/0x0000000000085d4780B73119b644AE5ecd22b376`,
}, {
  name: Assets.CRV,
  address: `${Ethereum}/0xD533a949740bb3306d119CC777fa900bA034cd52`,
}, {
  address: `${Ethereum}/0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd`,
  decimals: 2,
  name: Assets.GUSD,
}, {
  name: Assets.BAL,
  address: `${Ethereum}/0xba100000625a3754423978a60c9317c58a424e3D`,
}, {
  name: Assets.XSUSHI,
  address: `${Ethereum}/0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272`,
}, {
  name: Assets.RENFIL,
  address: `${Ethereum}/0xD5147bc8e386d91Cc5DBE72099DAC6C9b99276F5`,
}, {
  name: Assets.RAI,
  address: `${Ethereum}/0x03ab458634910aad20ef5f1c8ee96f1d6ac54919`,
}, {
  name: Assets.aRAI,
  address: `${Ethereum}/0xc9bc48c72154ef3e5425641a3c747242112a46af`,
}].map(setAddressCategory(AddressCategories.ERC20));

const defiAddresses = [{
  name: "LendingPool",
  address: `${Polygon}/0x8dff5e27ea6b7ac08ebfdf9eb090f32ee9a30fcf`,
}, {
  name: "LendingPool",
  address: `${Ethereum}/0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9`,
}].map(setAddressCategory(AddressCategories.Defi));

const addresses = [
  ...erc20Addresses,
  ...defiAddresses,
];

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

const associatedTransfer = (asset: string, quantity: string) =>
  (transfer: Transfer): boolean =>
    assetsAreClose(asset, transfer.asset) &&
    valuesAreClose(transfer.quantity, quantity, div(quantity, "100"));

export const parser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${source}:${evmTx.hash.substring(0, 6)}` });
  const { getName, isSelf } = addressBook;

  const prefix = evmMeta.name === Guards.Ethereum ? "a"
    : evmMeta.name === Guards.Polygon ? "am"
    : "";

  const stkAAVEAddress = erc20Addresses.find(e => e.name === Assets.stkAAVE)?.address;

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    if (defiAddresses.some(e => e.address === address)) {
      tx.sources = dedup([source, ...tx.sources]);
      const event = parseEvent(lendingPoolAbi, txLog, evmMeta);
      if (!event.name) continue;

      if (event.name === "Deposit" && (isSelf(event.args.user) || isSelf(event.args.onBehalfOf))) {
        const asset = getName(event.args.reserve) as Asset;
        const amount = formatUnits(
          event.args.amount,
          addressBook.getDecimals(event.args.reserve),
        );
        log.info(`Parsing ${source} ${event.name} event of ${amount} ${asset}`);
        const aAsset = `${prefix}${asset.replace(/^W/, "")}`;
        const aTokenAddress = erc20Addresses?.find(entry => entry.name === aAsset)?.address;
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
          tx.method = "Deposit";
        }

      } else if (event.name === "Withdraw" && event.args.user === event.args.to) {
        const asset = getName(event.args.reserve) as Asset ;
        const amount = formatUnits(
          event.args.amount,
          addressBook.getDecimals(event.args.reserve),
        );
        log.info(`Parsing ${source} ${event.name} event of ${amount} ${asset}`);
        const aAsset = `${prefix}${asset.replace(/^W/, "")}`;
        const aTokenAddress = erc20Addresses?.find(entry => entry.name === aAsset)?.address;
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
          tx.method = "Withdraw";
        }

      } else if (event.name === "Borrow" && (event.args.user===event.args.onBehalfOf) ) {
        const asset = getName(event.args.reserve) as Asset ;
        const amount = formatUnits(
          event.args.amount,
          addressBook.getDecimals(event.args.reserve),
        );
        log.info(`Parsing ${source} ${event.name} event of ${amount} ${asset}`);
        const borrow = tx.transfers.find(associatedTransfer(asset, amount));
        if (borrow) {
          borrow.category = Borrow;
          borrow.from = address; // should this be a non-address account?
        } else {
          log.warn(`${event.name}: Can't find borrow of ${amount} ${asset}`);
        }
        tx.method = "Borrow";

      } else if (event.name === "Repay"&& (event.args.user===event.args.repayer) ) {
        const asset = getName(event.args.reserve) as Asset ;
        const amount = formatUnits(
          event.args.amount,
          addressBook.getDecimals(event.args.reserve),
        );
        log.info(`Parsing ${source} ${event.name} event of ${amount} ${asset}`);
        const repay = tx.transfers.find(associatedTransfer(asset, amount));
        if (repay) {
          repay.category = Repay;
          repay.from = address; // should this be a non-address account?
        } else {
          log.warn(`${event.name}: Can't find repayment of ${amount} ${asset}`);
        }
        tx.method = "Repay";

      } else {
        log.debug(`Skipping ${event.name} event`);
      }

    } else if (stkAAVEAddress === address) {
      const event = parseEvent(aaveStakeAbi, txLog, evmMeta);
      if (event.name === "Staked"&& (event.args.from===event.args.onBehalfOf) ) {
        const asset1 = Assets.AAVE;
        const asset2 = Assets.stkAAVE;
        const amount = formatUnits(
          event.args.amount,
          addressBook.getDecimals(address),
        );
        log.info(`Parsing ${source} ${event.name} of ${amount} ${asset1}`);
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
          tx.method = "Deposit";
          log.debug(`${event.name}: for ${amount} ${asset1} has been processed`);
        }

      } else if (event.name === "Redeem" && (event.args.from===event.args.to)) {
        const asset1 = Assets.AAVE;
        const asset2 = Assets.stkAAVE;
        const amount = formatUnits(
          event.args.amount,
          addressBook.getDecimals(address),
        );
        log.info(`Parsing ${source} ${event.name} of ${amount} ${asset2}`);
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

export const app = { addresses, name, parser };
