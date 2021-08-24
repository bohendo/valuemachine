import {
  AddressCategories,
} from "@valuemachine/types";
import {
  setAddressCategory,
} from "@valuemachine/utils";

import { assets } from "./assets";

const machineryAddresses = [
  { name: "yGovernance", address: "Ethereum/0xba37b002abafdd8e89a1995da52740bbc013d992" },
].map(setAddressCategory(AddressCategories.Defi));

const yVaultV1Addresses = [{
  name: assets.y3Crv,
  address: "Ethereum/0x9ca85572e6a3ebf24dedd195623f188735a5179f",
}, {
  name: assets.yBUSDv3,
  address: "Ethereum/0x04bc0ab673d88ae9dbc9da2380cb6b79c4bca9ae",
}, {
  name: assets.yDAI,
  address: "Ethereum/0xacd43e627e64355f1861cec6d3a6688b31a6f952",
}, {
  name: assets.yDAIv2,
  address: "Ethereum/0x16de59092dae5ccf4a1e6439d611fd0653f0bd01",
}, {
  name: assets.yDAIv3,
  address: "Ethereum/0xc2cb1040220768554cf699b0d863a3cd4324ce32",
}, {
  name: assets.yGUSD,
  address: "Ethereum/0xec0d8d3ed5477106c6d4ea27d90a60e594693c90",
}, {
  name: assets.ysUSDTv2,
  address: "Ethereum/0xf61718057901f84c4eec4339ef8f0d86d2b45600",
}, {
  name: assets.yTUSD,
  address: "Ethereum/0x37d19d1c4e1fa9dc47bd1ea12f742a0887eda74a",
}, {
  name: assets.yTUSDv2,
  address: "Ethereum/0x73a052500105205d34daf004eab301916da8190f",
}, {
  name: assets.yUSDC,
  address: "Ethereum/0x597ad1e0c13bfe8025993d9e79c69e1c0233522e",
}, {
  name: assets.yUSDCv2,
  address: "Ethereum/0xd6ad7a6750a7593e092a9b218d66c0a814a3436e",
}, {
  name: assets.yUSDCv3,
  address: "Ethereum/0x26ea744e5b887e5205727f55dfbe8685e3b21951",
}, {
  name: assets.yUSDT,
  address: "Ethereum/0x2f08119c6f07c006695e079aafc638b8789faf18",
}, {
  name: assets.yUSDTv2,
  address: "Ethereum/0x83f798e925bcd4017eb265844fddabb448f1707d",
}, {
  name: assets.yUSDTv3,
  address: "Ethereum/0xe6354ed5bc4b393a5aad09f21c46e101e692d447",
}, {
  name: assets.yvankrCRV,
  address: "Ethereum/0xe625f5923303f1ce7a43acfefd11fd12f30dbca4",
}, {
  name: assets.yvcrvPlain3andSUSD,
  address: "Ethereum/0x5533ed0a3b83f70c3c4a1f69ef5546d3d4713e44",
}, {
  name: assets.yvdusd3CRV,
  address: "Ethereum/0x8e6741b456a074f0bc45b8b82a755d4af7e965df",
}, {
  name: assets.yveursCRV,
  address: "Ethereum/0x98b058b2cbacf5e99bc7012df757ea7cfebd35bc",
}, {
  name: assets.yvgusd3CRV,
  address: "Ethereum/0xcc7e70a958917cce67b4b87a8c30e6297451ae98",
}, {
  name: assets.yvhCRV,
  address: "Ethereum/0x46afc2dfbd1ea0c0760cad8262a5838e803a37e5",
}, {
  name: assets.yvhusd3CRV,
  address: "Ethereum/0x39546945695dcb1c037c836925b355262f551f55",
}, {
  name: assets.yvlinkCRV,
  address: "Ethereum/0x96ea6af74af09522fcb4c28c269c26f59a31ced6",
}, {
  name: assets.yvmusd3CRV,
  address: "Ethereum/0x0fcdaedfb8a7dfda2e9838564c5a1665d856afdf",
}, {
  name: assets.yvusdn3CRV,
  address: "Ethereum/0xfe39ce91437c76178665d64d7a2694b0f6f17fe3",
}, {
  name: assets.yvusdp3CRV,
  address: "Ethereum/0x1b5eb1173d2bf770e50f10410c9a96f7a8eb6e75",
}, {
  name: assets.yvusdt3CRV,
  address: "Ethereum/0xf6c9e9af314982a4b38366f4abfaa00595c5a6fc",
}, {
  name: assets.yWBTCv2,
  address: "Ethereum/0x04aa51bbcb46541455ccf1b8bef2ebc5d3787ec9",
}, {
  name: assets.yWETH,
  address: "Ethereum/0xe1237aa7f535b0cc33fd973d66cbf830354d16c7",
}, {
  name: assets.yyDAI_yUSDC_yUSDT_yBUSD,
  address: "Ethereum/0x2994529c0652d127b7842094103715ec5299bbed",
}, {
  name: assets.yyDAI_yUSDC_yUSDT_yTUSD,
  address: "Ethereum/0x5dbcf33d8c2e976c6b560249878e6f1491bca25c",
}, {
  name: assets.yYFI,
  address: "Ethereum/0xba2e7fed597fd0e3e70f5130bcdbbfe06bb94fe1",
}].map(setAddressCategory(AddressCategories.ERC20));

const yVaultV2Addresses = [{
  name: assets.yv1INCH,
  address: "Ethereum/0xb8c3b7a2a618c552c23b1e4701109a9e756bab67",
}, {
  name: assets.yvBOOST,
  address: "Ethereum/0x9d409a0a012cfba9b15f6d4b36ac57a46966ab9a",
}, {
  name: assets.yvCurve_BBTC,
  address: "Ethereum/0x8fa3a9ecd9efb07a8ce90a6eb014cf3c0e3b32ef",
}, {
  name: assets.yvCurve_FRAX,
  address: "Ethereum/0xb4ada607b9d6b2c9ee07a275e9616b84ac560139",
}, {
  name: assets.yvCurve_IronBank,
  address: "Ethereum/0x27b7b1ad7288079a66d12350c828d3c00a6f07d7",
}, {
  name: assets.yvCurve_LUSD,
  address: "Ethereum/0x5fa5b62c8af877cb37031e0a3b2f34a78e3c56a6",
}, {
  name: assets.yvCurve_oBTC,
  address: "Ethereum/0xe9dc63083c464d6edccff23444ff3cfc6886f6fb",
}, {
  name: assets.yvCurve_pBTC,
  address: "Ethereum/0x3c5df3077bcf800640b5dae8c91106575a4826e6",
}, {
  name: assets.yvCurve_renBTC,
  address: "Ethereum/0x7047f90229a057c13bf847c0744d646cfb6c9e1a",
}, {
  name: assets.yvCurve_sAave,
  address: "Ethereum/0xb4d1be44bff40ad6e506edf43156577a3f8672ec",
}, {
  name: assets.yvCurve_sBTC,
  address: "Ethereum/0x8414db07a7f743debafb402070ab01a4e0d2e45e",
}, {
  name: assets.yvCurve_sETH,
  address: "Ethereum/0x986b4aff588a109c09b50a03f42e4110e29d353f",
}, {
  name: assets.yvCurve_stETH,
  address: "Ethereum/0xdcd90c7f6324cfa40d7169ef80b12031770b4325",
}, {
  name: assets.yvCurve_tBTC,
  address: "Ethereum/0x23d3d0f1c697247d5e0a9efb37d8b0ed0c464f7f",
}, {
  name: assets.yvUSDT,
  address: "Ethereum/0x7da96a3891add058ada2e826306d812c638d87a7",
}, {
  name: assets.yvWBTC,
  address: "Ethereum/0xcb550a6d4c8e3517a939bc79d0c7093eb7cf56b5",
}, {
  name: assets.yvWETH,
  address: "Ethereum/0x5f18c75abdae578b483e5f43f12a39cf75b973a9",
}, {
  name: assets.yvYFI,
  address: "Ethereum/0xe14d13d8b3b85af791b2aadd661cdbd5e6097db1",
}].map(setAddressCategory(AddressCategories.ERC20));

const govTokenAddresses = [{
  name: assets.YFI,
  address: "Ethereum/0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e",
}].map(setAddressCategory(AddressCategories.ERC20));

export const yTokenAddresses = [...yVaultV1Addresses, ...yVaultV2Addresses];

export const govAddress = govTokenAddresses.find(e => e.name === assets.YFI).address;

export const addresses = [
  ...govTokenAddresses,
  ...yTokenAddresses,
  ...machineryAddresses,
];
