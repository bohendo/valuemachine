import { publicEthereumAddresses } from "./ethereum";
import { publicPolygonAddresses } from "./polygon";
import { appAddresses } from "./apps";

export { AppNames } from "./apps";
export { parseEvmTx } from "./parser";

export { getEthereumData } from "./ethereum";
export { getPolygonData } from "./polygon";

export const ethereumAddresses = [
  ...publicEthereumAddresses,
  ...appAddresses.filter(e => e.address.startsWith("Ethereum/")),
];

export const polygonAddresses = [
  ...publicPolygonAddresses,
  ...appAddresses.filter(e => e.address.startsWith("Polygon/")),
];

export const publicAddresses = [
  ...publicEthereumAddresses,
  ...publicPolygonAddresses,
  ...appAddresses,
];
