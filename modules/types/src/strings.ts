import { Static, Type } from "@sinclair/typebox";

export const Address = Type.RegEx(/^0x[a-fA-F0-9]{40}$/);
export type Address = Static<typeof Address>;

export const Bytes32 = Type.RegEx(/^0x[a-fA-F0-9]{64}$/);
export type Bytes32 = Static<typeof Bytes32>;

export const DateString = Type.RegEx(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/);
export type DateString = Static<typeof DateString>;

export const HexString = Type.RegEx(/^0x[a-fA-F0-9]*$/);
export type HexString = Static<typeof HexString>;

export const DecimalString = Type.RegEx(/^[0-9]*\.?[0-9]*$/);
export type DecimalString = Static<typeof DecimalString>;

export type Account = Address | string; // eg a self address or something like "Maker-CDP-123"
export type TimestampString = string; // eg "2020-02-27T09:51:30.444Z" (ISO 8601 format)
