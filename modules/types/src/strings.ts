import { Static, Type } from "@sinclair/typebox";

export const EvmAddress = Type.RegEx(/^0x[a-fA-F0-9]{40}$/);
export type EvmAddress = Static<typeof EvmAddress>;

// <guard>[/<venue>]/address
// eg Ethereum/0xabc123.. for simple on-chain accounts
// eg Ethereum/Maker/CDP-123/0xabc123.. for on-chain deposits
// eg USA/Coinbase/1 for off-chain trad fi services
export const Account = Type.RegEx(/^[-/a-zA-Z0-9]+$/); // TODO: tighten regex
export type Account = Static<typeof Account>;

export const Asset = Type.RegEx(/^[_a-zA-Z0-9]{1,32}$/);
export type Asset = Static<typeof Asset>;

export const Bytes32 = Type.RegEx(/^0x[a-fA-F0-9]{64}$/);
export type Bytes32 = Static<typeof Bytes32>;

export const DateString = Type.String({ format: "date" });
export type DateString = Static<typeof DateString>;

export const HexString = Type.RegEx(/^0x[a-fA-F0-9]*$/);
export type HexString = Static<typeof HexString>;

export const DecimalString = Type.RegEx(/^-?[0-9]*\.?[0-9]*$/);
export type DecimalString = Static<typeof DecimalString>;

export const TimestampString = Type.String({ format: "date-time" });
export type TimestampString = Static<typeof TimestampString>;
