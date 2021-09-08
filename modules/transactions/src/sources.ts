import { CsvSources } from "./csv/enums";
import { EvmNames } from "./evm/enums";

export { CsvSources } from "./csv/enums";
export { EvmNames as EvmSources } from "./evm/enums";

export const TransactionSources = {
  ...CsvSources,
  ...EvmNames,
} as const;
