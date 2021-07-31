import { Guards } from "@valuemachine/types";

import { publicEthereumAddresses } from "./ethereum";
import { publicPolygonAddresses } from "./polygon";
import { appAddresses } from "./apps";

export const ethereumAddresses = [
  ...publicEthereumAddresses,
  ...appAddresses.filter(e => e.guard === Guards.Ethereum),
];

export const polygonAddresses = [
  ...publicPolygonAddresses,
  ...appAddresses.filter(e => e.guard === Guards.Polygon),
];

export const publicAddresses = [
  ...ethereumAddresses,
  ...polygonAddresses,
];

export { getEthereumData } from "./ethereum";
export { getPolygonData } from "./polygon";
