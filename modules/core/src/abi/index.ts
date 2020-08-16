import { Address } from "@finances/types";
import { utils } from "ethers";

import cTokenAbi from "./cToken.json";
import compoundAbi from "./compound.json";
import daiAbi from "./dai.json";
import daiJoinAbi from "./daiJoin.json";
// import erc20Abi from "./erc20.json";
import mkrAbi from "./mkr.json";
import oasisDexAbi from "./oasisDex.json";
import saiAbi from "./sai.json";
import vatAbi from "./vat.json";
import wethAbi from "./weth.json";

const erc20Abi = [
  "event Approval(address indexed from, address indexed to, uint amount)",
  "event Transfer(address indexed from, address indexed to, uint amount)",
  "function allowance(address owner, address spender) view returns (uint)",
  "function approve(address spender, uint amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint)",
  "function decimals() view returns (uint)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint)",
  "function transfer(address recipient, uint amount)",
  "function transferFrom(address sender, address recipient, uint amount)",
];

type EventFragment = utils.EventFragment;
type Interface = utils.Interface;
const { Interface } = utils;

export const getTokenInterface = (address?: Address): Interface => !address
  ? new Interface(erc20Abi)
  : address === "0x6b175474e89094c44da98b954eedeac495271d0f"
  ? new Interface(daiAbi)
  : address === "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2"
  ? new Interface(mkrAbi)
  : address === "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359"
  ? new Interface(saiAbi)
  : address === "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
  ? new Interface(wethAbi)
  : new Interface(erc20Abi);

export const daiJoinInterface = new Interface(daiJoinAbi);
export const defiInterface = new Interface(compoundAbi.concat(cTokenAbi));
export const exchangeInterface = new Interface(oasisDexAbi);
export const tokenEvents = new Interface([].concat([daiAbi, erc20Abi, saiAbi, wethAbi]));
export const vatInterface = new Interface(vatAbi);
