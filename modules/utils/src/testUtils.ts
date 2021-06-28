import { use } from "chai";
import promised from "chai-as-promised";

import { getLogger } from "./logger";

use(promised);

export { expect } from "chai";
export const testLogger = getLogger(process.env.LOG_LEVL || "warn");
