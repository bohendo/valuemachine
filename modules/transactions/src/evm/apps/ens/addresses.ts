import {
  AddressCategories,
} from "@valuemachine/types";
import {
  setAddressCategory,
} from "@valuemachine/utils";

import { Apps, Evms } from "../../enums";

const { ENS } = Apps;
const { Ethereum } = Evms;

export const nftAddresses = [{
  address: `${Ethereum}/0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85`,
  name: ENS, // current
}, {
  address: `${Ethereum}/0xFaC7BEA255a6990f749363002136aF6556b31e04`,
  name: ENS, // legacy
}].map(setAddressCategory(AddressCategories.NFT));

const supportingAddresses = [{
  address: `${Ethereum}/0x314159265dD8dbb310642f98f50C066173C1259b`,
  name: `${ENS}_Core`,
}, {
  address: `${Ethereum}/0xD3ddcCDD3b25A8a7423B5bEe360a42146eb4Baf3`,
  name: `${ENS}_Resolver`,
}, {
  address: `${Ethereum}/0x6090A6e47849629b7245Dfa1Ca21D94cd15878Ef`,
  name: `${ENS}_RegistrarV1`,
}, {
  address: `${Ethereum}/0xB22c1C159d12461EA124b0deb4b5b93020E6Ad16`,
  name: `${ENS}_RegistrarV2`,
}, {
  address: `${Ethereum}/0x283Af0B28c62C092C9727F1Ee09c02CA627EB7F5`,
  name: `${ENS}_RegistrarV3`,
}, {
  address: `${Ethereum}/0x9062c0a6dbd6108336bcbe4593a3d1ce05512069`,
  name: `${ENS}_ReverseRegistrarV1`,
}, {
  address: `${Ethereum}/0x084b1c3c81545d370f3634392de611caabff8148`,
  name: `${ENS}_ReverseRegistrarV2`,
}].map(setAddressCategory(AddressCategories.Public));

export const addresses = [
  ...nftAddresses,
  ...supportingAddresses,
];

export const coreAddress = addresses.find(e => e.name.endsWith("Core"))?.address;
export const resolverAddress = addresses.find(e => e.name.endsWith("Resolver"))?.address;
export const registrarV1Address = addresses.find(e => e.name.endsWith("rarV1"))?.address;
export const registrarV2Address = addresses.find(e => e.name.endsWith("rarV2"))?.address;
export const registrarV3Address = addresses.find(e => e.name.endsWith("rarV3"))?.address;
