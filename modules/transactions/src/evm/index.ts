import { Guards } from "@valuemachine/types";

import { publicEthereumAddresses } from "./ethereum";
import { publicPolygonAddresses } from "./polygon";
import { appAddresses } from "./apps";

export const ethereumAddresses = [
  ...publicEthereumAddresses,
  ...appAddresses.filter(e => e.guard === Guards.ETH),
];

export const polygonAddresses = [
  ...publicPolygonAddresses,
  ...appAddresses.filter(e => e.guard === Guards.MATIC),
];

export const publicAddresses = [
  ...ethereumAddresses,
  ...polygonAddresses,
];

export { getEthereumData } from "./ethereum";
export { getPolygonData } from "./polygon";
