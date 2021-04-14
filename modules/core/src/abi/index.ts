import { Address, AddressCategories } from "@finances/types";
import { utils } from "ethers";

import { getAddressBook } from "../addressBook";

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

const { Interface } = utils;
const addressBook = getAddressBook([]);

export const getTokenInterface = (address?: Address): utils.Interface => !address
  ? new Interface(erc20Abi)
  : addressBook.getName(address) === "DAI"
    ? new Interface(daiAbi)
    : addressBook.getName(address) === "MKR"
      ? new Interface(mkrAbi)
      : addressBook.getName(address) === "SAI"
        ? new Interface(saiAbi)
        : addressBook.getName(address) === "WETH"
          ? new Interface(wethAbi)
          : addressBook.isCategory(AddressCategories.Compound)(address)
            ? new Interface(cTokenAbi)
            : new Interface(erc20Abi);

export const daiJoinInterface = new Interface(daiJoinAbi);
export const defiInterface = new Interface([...new Set(compoundAbi.concat(cTokenAbi))]);
export const exchangeInterface = new Interface(oasisDexAbi);
export const vatInterface = new Interface(vatAbi);

// Compound V1 addresses are available at:
// https://github.com/compound-finance/compound-money-market/tree/master/networks
