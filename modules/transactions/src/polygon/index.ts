import { aaveAddresses } from "./aave";
import { erc20Addresses } from "./erc20";

export { getPolygonData } from "./polygonData";

export const polygonAddresses = [
  ...aaveAddresses,
  ...erc20Addresses,
];
