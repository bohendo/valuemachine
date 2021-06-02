// import { Interface } from "@ethersproject/abi";
import {
  AddressBook,
  AddressBookJson,
  AddressCategories,
  Assets,
  ChainData,
  EthTransaction,
  Logger,
  Transaction,
  TransactionSources,
  TransferCategories,
} from "@finances/types";
import { math } from "@finances/utils";

import { rmDups } from "../utils";

const { Income, Expense, SwapOut, SwapIn } = TransferCategories;
const { round } = math;

const source = TransactionSources.Yearn;
const { YFI,
  yBUSDv3, yDAIv2, yDAIv3, ysUSDTv2, yTUSDv2,
  yUSDCv2, yUSDCv3, yUSDTv2, yUSDTv3, yWBTCv2, yWETH, yYFI,

  yvlinkCRV, yvusdp3CRV, yvankrCRV, yyDAI_yUSDC_yUSDT_yTUSD,
  yvmusd3CRV, yvgusd3CRV, yvdusd3CRV, yvusdn3CRV, yvusdt3CRV,
  yvhusd3CRV, yyDAI_yUSDC_yUSDT_yBUSD, yvcrvPlain3andSUSD, y3Crv,
  yveursCRV, yvhCRV, yDAI, yGUSD, yTUSD, yUSDC, yUSDT,

  yvYFI, yv1INCH, yvWETH, yvWBTC, yvUSDT, yvCurve_IronBank,
  yvCurve_sETH, yvCurve_stETH, yvCurve_sBTC, yvCurve_renBTC,
  yvCurve_oBTC, yvCurve_pBTC, yvCurve_tBTC, yvCurve_FRAX, yvCurve_LUSD,
  yvCurve_sAave, yvCurve_BBTC, yvBOOST,

  linkCRV, usdp3CRV, ankrCRV, yDAI_yUSDC_yUSDT_yTUSD, musd3CRV, gusd3CRV,
  dusd3CRV, usdn3CRV, ust3CRV, husd3CRV, yDAI_yUSDC_yUSDT_yBUSD,
  crvPlain3andSUSD, _3Crv, eursCRV, hCRV, _1INCH,

  BUSDv3, USDT, USDC, DAI, GUSD, sUSDT, TUSD, yv3Crv, yvust3CRV, usdt3CRV,
  WBTC, WETH

} = Assets;

////////////////////////////////////////
/// Addresses

const machineryAddresses = [
].map(row => ({ ...row, category: AddressCategories.Defi })) as AddressBookJson;

const yVaultV1Addresses = [
  { name: y3Crv, address: "0x9ca85572e6a3ebf24dedd195623f188735a5179f" },
  { name: yBUSDv3, address: "0x04bc0ab673d88ae9dbc9da2380cb6b79c4bca9ae" },
  { name: yDAI, address: "0xacd43e627e64355f1861cec6d3a6688b31a6f952" },
  { name: yDAIv2, address: "0x16de59092dae5ccf4a1e6439d611fd0653f0bd01" },
  { name: yDAIv3, address: "0xc2cb1040220768554cf699b0d863a3cd4324ce32" },
  { name: yGUSD, address: "0xec0d8d3ed5477106c6d4ea27d90a60e594693c90" },
  { name: ysUSDTv2, address: "0xf61718057901f84c4eec4339ef8f0d86d2b45600" },
  { name: yTUSD, address: "0x37d19d1c4e1fa9dc47bd1ea12f742a0887eda74a" },
  { name: yTUSDv2, address: "0x73a052500105205d34daf004eab301916da8190f" },
  { name: yUSDC, address: "0x597ad1e0c13bfe8025993d9e79c69e1c0233522e" },
  { name: yUSDCv2, address: "0xd6ad7a6750a7593e092a9b218d66c0a814a3436e" },
  { name: yUSDCv3, address: "0x26ea744e5b887e5205727f55dfbe8685e3b21951" },
  { name: yUSDT, address: "0x2f08119c6f07c006695e079aafc638b8789faf18" },
  { name: yUSDTv2, address: "0x83f798e925bcd4017eb265844fddabb448f1707d" },
  { name: yUSDTv3, address: "0xe6354ed5bc4b393a5aad09f21c46e101e692d447" },
  { name: yvankrCRV, address: "0xe625f5923303f1ce7a43acfefd11fd12f30dbca4" },
  { name: yvcrvPlain3andSUSD, address: "0x5533ed0a3b83f70c3c4a1f69ef5546d3d4713e44" },
  { name: yvdusd3CRV, address: "0x8e6741b456a074f0bc45b8b82a755d4af7e965df" },
  { name: yveursCRV, address: "0x98b058b2cbacf5e99bc7012df757ea7cfebd35bc" },
  { name: yvgusd3CRV, address: "0xcc7e70a958917cce67b4b87a8c30e6297451ae98" },
  { name: yvhCRV, address: "0x46afc2dfbd1ea0c0760cad8262a5838e803a37e5" },
  { name: yvhusd3CRV, address: "0x39546945695dcb1c037c836925b355262f551f55" },
  { name: yvlinkCRV, address: "0x96ea6af74af09522fcb4c28c269c26f59a31ced6" },
  { name: yvmusd3CRV, address: "0x0fcdaedfb8a7dfda2e9838564c5a1665d856afdf" },
  { name: yvusdn3CRV, address: "0xfe39ce91437c76178665d64d7a2694b0f6f17fe3" },
  { name: yvusdp3CRV, address: "0x1b5eb1173d2bf770e50f10410c9a96f7a8eb6e75" },
  { name: yvusdt3CRV, address: "0xf6c9e9af314982a4b38366f4abfaa00595c5a6fc" },
  { name: yWBTCv2, address: "0x04aa51bbcb46541455ccf1b8bef2ebc5d3787ec9" },
  { name: yWETH, address: "0xe1237aa7f535b0cc33fd973d66cbf830354d16c7" },
  { name: yyDAI_yUSDC_yUSDT_yBUSD, address: "0x2994529c0652d127b7842094103715ec5299bbed" },
  { name: yyDAI_yUSDC_yUSDT_yTUSD, address: "0x5dbcf33d8c2e976c6b560249878e6f1491bca25c" },
  { name: yYFI, address: "0xba2e7fed597fd0e3e70f5130bcdbbfe06bb94fe1" },
].map(row => ({ ...row, category: AddressCategories.ERC20 })) as AddressBookJson;

const yVaultV2Addresses = [
  { name: yv1INCH, address: "0xb8c3b7a2a618c552c23b1e4701109a9e756bab67" },
  { name: yvBOOST, address: "0x9d409a0a012cfba9b15f6d4b36ac57a46966ab9a" },
  { name: yvCurve_BBTC, address: "0x8fa3a9ecd9efb07a8ce90a6eb014cf3c0e3b32ef" },
  { name: yvCurve_FRAX, address: "0xb4ada607b9d6b2c9ee07a275e9616b84ac560139" },
  { name: yvCurve_IronBank, address: "0x27b7b1ad7288079a66d12350c828d3c00a6f07d7" },
  { name: yvCurve_LUSD, address: "0x5fa5b62c8af877cb37031e0a3b2f34a78e3c56a6" },
  { name: yvCurve_oBTC, address: "0xe9dc63083c464d6edccff23444ff3cfc6886f6fb" },
  { name: yvCurve_pBTC, address: "0x3c5df3077bcf800640b5dae8c91106575a4826e6" },
  { name: yvCurve_renBTC, address: "0x7047f90229a057c13bf847c0744d646cfb6c9e1a" },
  { name: yvCurve_sAave, address: "0xb4d1be44bff40ad6e506edf43156577a3f8672ec" },
  { name: yvCurve_sBTC, address: "0x8414db07a7f743debafb402070ab01a4e0d2e45e" },
  { name: yvCurve_sETH, address: "0x986b4aff588a109c09b50a03f42e4110e29d353f" },
  { name: yvCurve_stETH, address: "0xdcd90c7f6324cfa40d7169ef80b12031770b4325" },
  { name: yvCurve_tBTC, address: "0x23d3d0f1c697247d5e0a9efb37d8b0ed0c464f7f" },
  { name: yvUSDT, address: "0x7da96a3891add058ada2e826306d812c638d87a7" },
  { name: yvWBTC, address: "0xcb550a6d4c8e3517a939bc79d0c7093eb7cf56b5" },
  { name: yvWETH, address: "0x5f18c75abdae578b483e5f43f12a39cf75b973a9" },
  { name: yvYFI, address: "0xe14d13d8b3b85af791b2aadd661cdbd5e6097db1" },
].map(row => ({ ...row, category: AddressCategories.ERC20 })) as AddressBookJson;

const yTokens = [...yVaultV1Addresses, ...yVaultV2Addresses];

const govTokenAddresses = [
  { name: YFI, address: "0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e" },
].map(row => ({ ...row, category: AddressCategories.ERC20 })) as AddressBookJson;

export const yearnAddresses = [
  ...yTokens,
  ...govTokenAddresses,
  ...machineryAddresses,
] as AddressBookJson;

////////////////////////////////////////
/// Interfaces

/*
const yVaultV1Interface = new Interface([
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

const yVaultV2Interface = new Interface([
  "event Transfer(address indexed sender, address indexed receiver, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event UpdateGovernance(address governance)",
  "event UpdateManagement(address management)",
  "event UpdateGuestList(address guestList)",
  "event UpdateRewards(address rewards)",
  "event UpdateDepositLimit(uint256 depositLimit)",
  "event UpdatePerformanceFee(uint256 performanceFee)",
  "event UpdateManagementFee(uint256 managementFee)",
  "event UpdateGuardian(address guardian)",
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
]);
*/

////////////////////////////////////////
/// Parser

const vaultToToken = (token: string): string[] => {
  switch (token) {
  case y3Crv: return _3Crv;
  case yBUSDv3: return BUSDv3;
  case yDAI: return DAI;
  case yDAIv2: return DAI;
  case yDAIv3: return DAI;
  case yGUSD: return GUSD;
  case ysUSDTv2: return sUSDT;
  case yTUSD: return TUSD;
  case yTUSDv2: return TUSD;
  case yUSDC: return USDC;
  case yUSDCv2: return USDC;
  case yUSDCv3: return USDC;
  case yUSDT: return USDT;
  case yUSDTv2: return USDT;
  case yUSDTv3: return USDT;
  case yv1INCH: return _1INCH;
  case yv3Crv: return _3Crv;
  case yvankrCRV: return ankrCRV;
  case yvcrvPlain3andSUSD: return crvPlain3andSUSD;
  case yvdusd3CRV: return dusd3CRV;
  case yveursCRV: return eursCRV;
  case yvgusd3CRV: return gusd3CRV;
  case yvhCRV: return hCRV;
  case yvhusd3CRV: return husd3CRV;
  case yvlinkCRV: return linkCRV;
  case yvmusd3CRV: return musd3CRV;
  case yvusdn3CRV: return usdn3CRV;
  case yvusdp3CRV: return usdp3CRV;
  case yvusdt3CRV: return usdt3CRV;
  case yvUSDT: return USDT;
  case yvust3CRV: return ust3CRV;
  case yvWBTC: return WBTC;
  case yvWETH: return WETH;
  case yvYFI: return YFI;
  case yWBTCv2: return WBTC;
  case yWETH: return WETH;
  case yyDAI_yUSDC_yUSDT_yBUSD: return yDAI_yUSDC_yUSDT_yBUSD;
  case yyDAI_yUSDC_yUSDT_yTUSD: return yDAI_yUSDC_yUSDT_yTUSD;
  case yYFI: return YFI;
  }
};

export const yearnParser = (
  tx: Transaction,
  ethTx: EthTransaction,
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${source}${ethTx.hash.substring(0, 6)}` });
  const { getName } = addressBook;

  // If some transfer interacts with a yToken
  tx.transfers.filter(transfer =>
    yTokens.some(yToken => yToken.name === transfer.asset)
  ).forEach(yTransfer => {
    const asset = vaultToToken(yTransfer.asset);
    log.info(`Parsing yToken transfer of ${round(yTransfer.quantity)} ${yTransfer.asset}`);
    const transfer = tx.transfers.find(t =>
      t.asset === asset
      && (
        (t.category === Income && yTransfer.category === Expense) ||
        (yTransfer.category === Income && t.category === Expense)
      )
    );
    if (!transfer) {
      log.warn(yTransfer, `Couldn't find a matching ${asset} transfer`);
    } else {
      tx.sources = rmDups([source, ...tx.sources]) as TransactionSources[];
      transfer.category = transfer.category === Income ? SwapIn : SwapOut;
      yTransfer.category = yTransfer.category === Income ? SwapIn : SwapOut;
    }
  });

  if (!tx.sources.includes(source)) {
    return tx;
  }

  const swapsIn = tx.transfers.filter(t => t.category === SwapIn);
  const swapsOut = tx.transfers.filter(t => t.category === SwapOut);
  tx.description = `${getName(swapsOut[0].from)} swapped ${
    round(swapsOut[0].quantity)
  } ${swapsOut[0].asset}${swapsOut.length > 1 ? ", etc" : ""} for ${
    round(swapsIn[0].quantity)
  } ${swapsIn[0].asset}${swapsIn.length > 1 ? ", etc" : ""} via ${source}`;

  // log.debug(tx, `Done parsing ${source}`);
  return tx;
};
