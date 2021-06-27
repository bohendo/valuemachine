import { Static, Type } from "@sinclair/typebox";

export const Address = Type.RegEx(/^0x[a-fA-F0-9]{40}$/);
export type Address = Static<typeof Address>;

export const Account = Type.RegEx(/^[-a-zA-Z0-9]+$/);
export type Account = Static<typeof Account>;

export const Bytes32 = Type.RegEx(/^0x[a-fA-F0-9]{64}$/);
export type Bytes32 = Static<typeof Bytes32>;

export const DateString = Type.String({ format: "date" });
export type DateString = Static<typeof DateString>;

export const HexString = Type.RegEx(/^0x[a-fA-F0-9]*$/);
export type HexString = Static<typeof HexString>;

export const DecimalString = Type.RegEx(/^[0-9]*\.?[0-9]*$/);
export type DecimalString = Static<typeof DecimalString>;

export const TimestampString = Type.String({ format: "date-time" });
export type TimestampString = Static<typeof TimestampString>;
