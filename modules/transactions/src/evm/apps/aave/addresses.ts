import {
  AddressCategories,
  Assets,
  Guards,
} from "@valuemachine/types";
import {
  setAddressCategory,
} from "@valuemachine/utils";

import { assets } from "./assets";

const { Polygon, Ethereum } = Guards;

// https://docs.aave.com/developers/deployed-contracts/deployed-contracts

const erc20Addresses = [{
  address: `${Polygon}/0xD6DF932A45C0f255f85145f286eA0b292B21C90B`,
  name: assets.AAVE,
}, {
  address: `${Ethereum}/0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9`,
  name: assets.AAVE,
}, {
  address: `${Polygon}/0x1d2a0E5EC8E5bBDCA5CB219e649B565d8e5c3360`,
  name: assets.amAAVE,
}, {
  address: `${Polygon}/0x27F8D03b3a2196956ED754baDc28D73be8830A6e`,
  name: assets.amDAI,
}, {
  address: `${Polygon}/0x1a13F4Ca1d028320A707D99520AbFefca3998b7F`,
  name: assets.amUSDC,
}, {
  address: `${Polygon}/0x60D55F02A771d515e077c9C2403a1ef324885CeC`,
  name: assets.amUSDT,
}, {
  address: `${Polygon}/0x28424507fefb6f7f8E9D3860F56504E4e5f5f390`,
  name: assets.amWETH,
}, {
  address: `${Polygon}/0x5c2ed810328349100A66B82b78a1791B101C9D61`,
  name: assets.amWBTC,
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

export const defiAddresses = [{
  name: "LendingPool",
  address: `${Polygon}/0x8dff5e27ea6b7ac08ebfdf9eb090f32ee9a30fcf`,
}, {
  name: "LendingPool",
  address: `${Ethereum}/0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9`,
}].map(setAddressCategory(AddressCategories.Defi));

export const addresses = [
  ...erc20Addresses,
  ...defiAddresses,
];
