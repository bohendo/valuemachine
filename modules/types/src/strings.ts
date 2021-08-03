import { Static, Type } from "@sinclair/typebox";

export const EvmAddress = Type.RegEx(/^0x[a-fA-F0-9]{40}$/);
export type EvmAddress = Static<typeof Address>;

export const Address = Type.Union([EvmAddress, Type.String()]);
export type Address = Static<typeof Address>;

// eg evm:1/Compound:0xabc123.. (chainType:chainId/app:address a la CAIP-10) for on-chain accounts
// eg USD:Coinbase:1 (jurisdiction:venue:accountIndex) for off-chain trad fi
export const Account = Type.RegEx(/^[-a-zA-Z0-9/:]+$/);
export type Account = Static<typeof Account>;

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
