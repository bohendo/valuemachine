export type FormDateString = string; // eg "02, 27, 2020" as required by form f8949 etc
export type DateString = string; // eg "2020-02-27" aka TimestampString.split("T")[0] 
export type DecimalString = string; // eg "-3.1415"
export type HexString = string; // eg "0xabc123"
export type Address = HexString | null; // eg null "to" during contract creation
export type Bytes32 = HexString; // eg "0xabc123" of length 32 bytes
export type TimestampString = string; // eg "2020-02-27T09:51:30.444Z" (ISO 8601 format)
