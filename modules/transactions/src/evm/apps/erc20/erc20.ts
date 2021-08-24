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
  TransferCategories,
} from "@valuemachine/types";
import {
  setAddressCategory,
} from "@valuemachine/utils";

import { parseEvent } from "../utils";

export const appName = "ERC20";

const {
  BAT, CHERRY, GEN, GNO, GRT, OMG, REP, REPv2, SNT,
  SNX, SPANK, sUSD, USDC, USDT, WBTC, ZRX,
  linkCRV, usdp3CRV, ankrCRV, yDAI_yUSDC_yUSDT_yTUSD, musd3CRV, gusd3CRV,
  dusd3CRV, usdn3CRV, ust3CRV, husd3CRV, yDAI_yUSDC_yUSDT_yBUSD,
  crvPlain3andSUSD, _3Crv, eursCRV, hCRV, _1INCH,
  DAI, WETH, WMATIC,
} = Assets;
const { Expense, Income, Internal, Unknown } = TransferCategories;

////////////////////////////////////////
/// Addresses

// Simple, standalone tokens only. App-specific tokens can be found in that app's parser.
const ethereumAddresses = [
  { name: BAT, address: "Ethereum/0x0d8775f648430679a709e98d2b0cb6250d2887ef" },
  { name: CHERRY, address: "Ethereum/0x4ecb692b0fedecd7b486b4c99044392784877e8c" },
  { name: GEN, address: "Ethereum/0x543ff227f64aa17ea132bf9886cab5db55dcaddf" },
  { name: GNO, address: "Ethereum/0x6810e776880c02933d47db1b9fc05908e5386b96" },
  { name: GRT, address: "Ethereum/0xc944e90c64b2c07662a292be6244bdf05cda44a7" },
  { name: OMG, address: "Ethereum/0xd26114cd6ee289accf82350c8d8487fedb8a0c07" },
  // re REPv0 -> REPv1 migration: https://medium.com/@AugurProject/augur-launches-794fa7f88c6a
  { name: REP, address: "Ethereum/0xe94327d07fc17907b4db788e5adf2ed424addff6" }, // version 0
  { name: REP, address: "Ethereum/0x1985365e9f78359a9b6ad760e32412f4a445e862" }, // version 1
  { name: REPv2, address: "Ethereum/0x221657776846890989a759ba2973e427dff5c9bb" }, // version 2
  { name: SNT, address: "Ethereum/0x744d70fdbe2ba4cf95131626614a1763df805b9e" },
  { name: SNX, address: "Ethereum/0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f" },
  { name: SNX, address: "Ethereum/0xc011a72400e58ecd99ee497cf89e3775d4bd732f" }, // v1
  { name: SPANK, address: "Ethereum/0x42d6622dece394b54999fbd73d108123806f6a18" },
  { name: sUSD, address: "Ethereum/0x57ab1ec28d129707052df4df418d58a2d46d5f51" },
  { name: sUSD, address: "Ethereum/0x57ab1e02fee23774580c119740129eac7081e9d3" }, // v1
  { name: USDC, address: "Ethereum/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", decimals: 6 },
  { name: USDT, address: "Ethereum/0xdac17f958d2ee523a2206206994597c13d831ec7", decimals: 6 },
  { name: WBTC, address: "Ethereum/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", decimals: 8 },
  { name: ZRX, address: "Ethereum/0xe41d2489571d322189246dafa5ebde1f4699f498" },
  { name: linkCRV, address: "Ethereum/0xcee60cfa923170e4f8204ae08b4fa6a3f5656f3a" },
  { name: usdp3CRV, address: "Ethereum/0x7eb40e450b9655f4b3cc4259bcc731c63ff55ae6" },
  { name: ankrCRV, address: "Ethereum/0xaa17a236f2badc98ddc0cf999abb47d47fc0a6cf" },
  { name: yDAI_yUSDC_yUSDT_yTUSD, address: "Ethereum/0xdf5e0e81dff6faf3a7e52ba697820c5e32d806a8" },
  { name: musd3CRV, address: "Ethereum/0x1aef73d49dedc4b1778d0706583995958dc862e6" },
  { name: gusd3CRV, address: "Ethereum/0xd2967f45c4f384deea880f807be904762a3dea07" },
  { name: dusd3CRV, address: "Ethereum/0x3a664ab939fd8482048609f652f9a0b0677337b9" },
  { name: usdn3CRV, address: "Ethereum/0x4f3e8f405cf5afc05d68142f3783bdfe13811522" },
  { name: ust3CRV, address: "Ethereum/0x94e131324b6054c0d789b190b2dac504e4361b53" },
  { name: husd3CRV, address: "Ethereum/0x5b5cfe992adac0c9d48e05854b2d91c73a003858" },
  { name: yDAI_yUSDC_yUSDT_yBUSD, address: "Ethereum/0x3b3ac5386837dc563660fb6a0937dfaa5924333b" },
  { name: crvPlain3andSUSD, address: "Ethereum/0xc25a3a3b969415c80451098fa907ec722572917f" },
  { name: _3Crv, address: "Ethereum/0x6c3f90f043a72fa612cbac8115ee7e52bde6e490" },
  { name: eursCRV, address: "Ethereum/0x194ebd173f6cdace046c53eacce9b953f28411d1" },
  { name: hCRV, address: "Ethereum/0xb19059ebb43466c323583928285a49f558e572fd" },
  { name: _1INCH, address: "Ethereum/0x111111111117dc0aa78b770fa6a738034120c302" },
].map(setAddressCategory(AddressCategories.ERC20));

const polygonAddresses = [
  { name: DAI, address: "Polygon/0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063" },
  { name: USDC, address: "Polygon/0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", decimals: 6 },
  { name: USDT, address: "Polygon/0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6 },
  { name: WBTC, address: "Polygon/0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", decimals: 8 },
  { name: WETH, address: "Polygon/0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619" },
  { name: WMATIC, address: "Polygon/0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270" },
].map(setAddressCategory(AddressCategories.ERC20));

export const erc20Addresses = [
  ...ethereumAddresses,
  ...polygonAddresses,
];

////////////////////////////////////////
/// ABIs

const erc20Abi = [
  "event Approval(address indexed from, address indexed to, uint amount)",
  "event Transfer(address indexed from, address indexed to, uint amount)",
];

////////////////////////////////////////
/// Parser

export const erc20Parser = (
  tx: Transaction,
  evmTx: EvmTransaction,
  evmMeta: EvmMetadata,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${appName}:${evmTx.hash.substring(0, 6)}` });
  const { getDecimals, getName, isSelf, isToken } = addressBook;

  for (const txLog of evmTx.logs) {
    const address = txLog.address;
    // Only parse known, ERC20 compliant tokens
    if (isToken(address)) {
      const event = parseEvent(erc20Abi, txLog, evmMeta);
      if (!event.name) continue;
      tx.apps.push(appName);
      const asset = getName(address) as Asset;
      // Skip transfers that don't concern self accounts
      if (!isSelf(event.args.from) && !isSelf(event.args.to)) {
        log.debug(`Skipping ${asset} ${event.name} that doesn't involve us (${event.args.to})`);
        continue;
      }
      const amount = formatUnits(event.args.amount, getDecimals(address));

      if (event.name === "Transfer") {
        log.info(`Parsing ${appName} ${event.name} of ${amount} ${asset}`);
        const from = event.args.from.endsWith(AddressZero) ? address : event.args.from;
        const to = event.args.to.endsWith(AddressZero) ? address : event.args.to;
        const category = isSelf(from) && isSelf(to) ? Internal
          : isSelf(from) && !isSelf(to) ? Expense
          : isSelf(to) && !isSelf(from) ? Income
          : Unknown;
        tx.transfers.push({ asset, category, from, index: txLog.index, quantity: amount, to });
        if (evmTx.to === address) {
          tx.method = `${asset} ${event.name}`;
        }

      } else if (event.name === "Approval") {
        log.debug(`Parsing ${appName} ${event.name} event for ${asset}`);
        if (evmTx.to === address) {
          tx.method = `${asset} ${event.name}`;
        }

      } else {
        log.warn(event, `Unknown ${asset} event`);
      }

    }
  }

  // log.debug(tx, `Done parsing ${appName}`);
  return tx;
};
