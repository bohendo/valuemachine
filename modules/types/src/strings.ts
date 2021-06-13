export type HexString = string; // eg "0xabc123"
export type Address = HexString | null; // eg null "to" during contract creation
export type Account = Address | string; // eg a self address or something like "Maker-CDP-123"
export type Bytes32 = HexString; // eg "0xabc123" of length 32 bytes
export type DateString = string; // eg "2020-02-27" aka TimestampString.split("T")[0] 
export type DecimalString = string; // eg "-3.1415"
export type TimestampString = string; // eg "2020-02-27T09:51:30.444Z" (ISO 8601 format)
