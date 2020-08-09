import { Address } from "@finances/types";
import { utils } from "ethers";

import cTokenAbi from "./cToken.json";
import compoundAbi from "./compound.json";
import daiAbi from "./dai.json";
import daiJoinAbi from "./daiJoin.json";
import erc20Abi from "./erc20.json";
import mkrAbi from "./mkr.json";
import oasisDexAbi from "./oasisDex.json";
import saiAbi from "./sai.json";
import vatAbi from "./vat.json";
import wethAbi from "./weth.json";

type Fragment = utils.Fragment;
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

const getEvents = (abi: any): Fragment[] =>
  Object.values((new Interface(abi)).events);

export const vatInterface = new Interface(vatAbi);
export const daiJoinInterface = new Interface(daiJoinAbi);

export const defiEvents = [
  compoundAbi,
  cTokenAbi,
].flatMap(getEvents) as Fragment[];

export const exchangeEvents = [
  oasisDexAbi,
].flatMap(getEvents) as Fragment[];

export const tokenEvents = [
  daiAbi,
  erc20Abi,
  saiAbi,
  wethAbi,
].flatMap(getEvents) as Fragment[];
