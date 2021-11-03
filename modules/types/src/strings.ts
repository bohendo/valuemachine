import { Static, Type } from "@sinclair/typebox";

// guard[/venue]/address
// eg Ethereum/0xabc123.. for simple on-chain accounts
// eg Ethereum/Maker-CDP-123/0xabc123.. for on-chain apps that support deposits/withdraws
// eg USA/Coinbase/account for off-chain trad fi services
export const Account = Type.RegEx(/^([a-zA-Z]{2,32}\/)?([-/a-zA-Z0-9_]+\/)?[-0-9a-zA-Z_]+$/);
export type Account = Static<typeof Account>;

// Decimal string or special string "ALL"
export const Amount = Type.RegEx(/^(-?[0-9]*\.?[0-9]*)|(ALL)$/);
export type Amount = Static<typeof Amount>;

export const App = Type.RegEx(/^[0-9a-zA-Z_]{3,32}$/);
export type App = Static<typeof App>;

export const Asset = Type.RegEx(/^[0-9a-zA-Z_]{1,32}$/);
export type Asset = Static<typeof Asset>;

export const Bytes32 = Type.RegEx(/^0x[0-9a-fA-F]{64}$/);
export type Bytes32 = Static<typeof Bytes32>;

export const CsvDigest = Type.RegEx(/^[0-9a-f]{8}$/);
export type CsvDigest = Static<typeof CsvDigest>;

export const DateString = Type.String({ format: "date" });
export type DateString = Static<typeof DateString>;

export const DecString = Type.RegEx(/^-?[0-9]*\.?[0-9]*$/);
export type DecString = Static<typeof DecString>;

export const EvmAddress = Type.RegEx(/^0x[a-fA-F0-9]{40}$/);
export type EvmAddress = Static<typeof EvmAddress>;

export const Guard = Type.RegEx(/^[a-zA-Z]{3,32}$/);
export type Guard = Static<typeof Guard>;

export const HexString = Type.RegEx(/^0x[a-fA-F0-9]*$/);
export type HexString = Static<typeof HexString>;

export const IntString = Type.RegEx(/^-?[0-9]*$/);
export type IntString = Static<typeof IntString>;

export const Method = Type.RegEx(/^[-_a-zA-Z0-9 ]+$/);
export type Method = Static<typeof Method>;

export const Source = Type.RegEx(/^[a-zA-Z]{3,32}$/);
export type Source = Static<typeof Source>;

export const DateTimeString = Type.String({ format: "date-time" });
export type DateTimeString = Static<typeof DateTimeString>;

// TODO: tighten regexes

// guard/hash
// eg Ethereum/0xabc123 for a tx on eth mainnet
export const TxId = Type.RegEx(/[a-zA-Z0-9]/);
export type TxId = Static<typeof TxId>;

// guard/hash/index
// eg Ethereum/0xabc123.../123 for a transfer at index 123
export const TransferId = Type.RegEx(/[a-zA-Z0-9]/);
export type TransferId = Static<typeof TransferId>;
