export const env = {
  alchemyProvider: process.env.VM_ALCHEMY_PROVIDER || "",
  covalentKey: process.env.VM_COVALENT_KEY || "",
  etherscanKey: process.env.VM_ETHERSCAN_KEY || "",
  logLevel: process.env.VM_LOG_LEVEL || "info",
  polygonscanKey: process.env.VM_POLYGONSCAN_KEY || "",
  port: parseInt(process.env.VM_PORT || "8080", 10),
};
