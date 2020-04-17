import { Address } from "@finances/types";
import { Interface, EventDescription, EventFragment, FunctionFragment } from "ethers/utils";

import compoundAbi from "./compound.json";
import daiAbi from "./dai.json";
import daiJoinAbi from "./daiJoin.json";
import erc20Abi from "./erc20.json";
import mkrAbi from "./mkr.json";
import oasisDexAbi from "./oasisDex.json";
import saiAbi from "./sai.json";
import vatAbi from "./vat.json";
import wethAbi from "./weth.json";

const getEvents = (abi: any): EventDescription[] => Object.values((new Interface(abi)).events);

export const getTokenAbi = (address?: Address): Array<EventFragment | FunctionFragment> => !address
  ? erc20Abi as Array<EventFragment | FunctionFragment>
  : address === "0x6b175474e89094c44da98b954eedeac495271d0f"
  ? daiAbi as Array<EventFragment | FunctionFragment>
  : address === "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2"
  ? mkrAbi as Array<EventFragment | FunctionFragment>
  : address === "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359"
  ? saiAbi as Array<EventFragment | FunctionFragment>
  : address === "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
  ? wethAbi as Array<EventFragment | FunctionFragment>
  : erc20Abi as Array<EventFragment | FunctionFragment>;

export const vatInterface = new Interface(vatAbi);
export const daiJoinInterface = new Interface(daiJoinAbi);

export const defiEvents = [
  compoundAbi,
].flatMap(getEvents) as EventDescription[];

export const exchangeEvents = [
  oasisDexAbi,
].flatMap(getEvents) as EventDescription[];

export const tokenEvents = [
  daiAbi,
  erc20Abi,
  saiAbi,
  wethAbi,
].flatMap(getEvents) as EventDescription[];
