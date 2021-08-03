export const env = {
  adminToken: process.env.VM_ADMIN_TOKEN || "abc123",
  covalentKey: process.env.VM_COVALENT_KEY || "",
  etherscanKey: process.env.VM_ETHERSCAN_KEY || "",
  logLevel: process.env.VM_LOG_LEVEL || "info",
  port: parseInt(process.env.VM_PORT || "8080", 10),
};
