export const env = {
  adminToken: process.env.FINANCES_ADMIN_TOKEN || "abc123",
  etherscanKey: process.env.FINANCES_ETHERSCAN_KEY || "",
  logLevel: "warn", // process.env.FINANCES_LOG_LEVEL || "info",
  port: parseInt(process.env.FINANCES_PORT || "8080", 10),
};
