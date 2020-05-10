export const env = {
  adminToken: process.env.FINANCES_ADMIN_TOKEN || "abc123",
  logLevel: parseInt(process.env.FINANCES_LOG_LEVEL || "3", 10),
  port: parseInt(process.env.FINANCES_PORT || "8080", 10),
};
