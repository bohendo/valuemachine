import { publicEthereumAddresses } from "./ethereum";
import { publicPolygonAddresses } from "./polygon";
import { appAddresses } from "./apps";

export { getEthereumData } from "./ethereum";
export { getPolygonData } from "./polygon";

export const ethereumAddresses = [
  ...publicEthereumAddresses,
  ...appAddresses.filter(e => e.address.startsWith("evm:1:")),
];

export const polygonAddresses = [
  ...publicPolygonAddresses,
  ...appAddresses.filter(e => e.address.startsWith("evm:137:")),
];

export const publicAddresses = [
  ...publicEthereumAddresses,
  ...publicPolygonAddresses,
  ...appAddresses,
];
