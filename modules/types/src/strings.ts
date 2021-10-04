import { Static, Type } from "@sinclair/typebox";

export const EvmAddress = Type.RegEx(/^0x[a-fA-F0-9]{40}$/);
export type EvmAddress = Static<typeof EvmAddress>;

// guard[/venue]/address
// eg Ethereum/0xabc123.. for simple on-chain accounts
// eg Ethereum/Maker-CDP-123/0xabc123.. for on-chain apps that support deposits/withdraws
// eg USA/Coinbase/account for off-chain trad fi services
export const Account = Type.RegEx(/^([a-zA-Z]{2,32}\/)?([-/a-zA-Z0-9_]+\/)?[-0-9a-zA-Z_]+$/);
export type Account = Static<typeof Account>;

// guard/hash
// eg Ethereum/0xabc123 for a tx on eth mainnet
export const TxId = Type.RegEx(/[a-zA-Z0-9]/);
export type TxId = Static<typeof TxId>;

export const Asset = Type.RegEx(/^[_a-zA-Z0-9]{1,32}$/);
export type Asset = Static<typeof Asset>;

// Decimal string or special string "ALL"
export const Amount = Type.RegEx(/^(-?[0-9]*\.?[0-9]*)|(ALL)$/);
export type Amount = Static<typeof Amount>;

export const App = Type.RegEx(/^[_a-zA-Z0-9]{3,32}$/);
export type App = Static<typeof App>;

export const Bytes32 = Type.RegEx(/^0x[a-fA-F0-9]{64}$/);
export type Bytes32 = Static<typeof Bytes32>;

export const DateString = Type.String({ format: "date" });
export type DateString = Static<typeof DateString>;

export const IntegerString = Type.RegEx(/^-?[0-9]*$/);
export type IntegerString = Static<typeof IntegerString>;

export const DecimalString = Type.RegEx(/^-?[0-9]*\.?[0-9]*$/);
export type DecimalString = Static<typeof DecimalString>;

export const Guard = Type.RegEx(/^[a-zA-Z]{3,32}$/);
export type Guard = Static<typeof Guard>;

export const Method = Type.RegEx(/^[-_a-zA-Z0-9 ]+$/);
export type Method = Static<typeof Method>;

export const HexString = Type.RegEx(/^0x[a-fA-F0-9]*$/);
export type HexString = Static<typeof HexString>;

export const TimestampString = Type.String({ format: "date-time" });
export type TimestampString = Static<typeof TimestampString>;

export const TransactionSource = Type.RegEx(/^[a-zA-Z]{3,32}$/);
export type TransactionSource = Static<typeof TransactionSource>;
