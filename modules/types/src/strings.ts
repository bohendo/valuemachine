import { Static, Type } from "@sinclair/typebox";

const toType = pattern => Type.RegEx(new RegExp(`^${pattern}$`));

////////////////////////////////////////
// Compose RegExp Constants

const num = "[0-9]";
const integer = `-?${num}+`;
const decimal = `${integer}(.${num}+)?`;

const alphanum = "[a-zA-Z0-9]+"; // eg "Uniswap"
const alphanumish = "[-_a-zA-Z0-9]+";  // eg "Uni-V2_DAI_ETH"
const words = "[-_ a-zA-Z0-9]+"; // eg "Deposit Liquidity"

const hex = `[0-9a-f]`;
// const checksummed = `[0-9a-fA-F]`;
// const evmAddress = `0x${checksummed}{40}`;
const bytes32 = `0x${hex}{64}`;
const digest = `${hex}{8}`;
const hexstring = `0x${hex}*`; // "0x" is a valid hex string that contains zero bytes of data

const guard = alphanum;
const venue = alphanumish;
const amount = `(${decimal})|(ALL)`; // Decimal string or special string "ALL"

// eg Ethereum/0xabc123.. for simple on-chain accounts
// eg Ethereum/Maker-CDP-123/0xabc123.. for on-chain deposits & defi accounts
// eg USA/Coinbase/account for off-chain trad fi services
const account = `(${guard}/)?(${venue}/)?${alphanumish}`;

// guard/hash[/index]
// eg Ethereum/0xabc123 for a tx on eth mainnet
// eg Ethereum/0xabc123/123 for a transfer at index 123
const txid = `${guard}/${alphanumish}(/${integer})?`;

// TaxYear eg USA2020 or IND2019
const countryId = `[A-Z]{3}`; // a stricter subset of guard
const year = `${num}{4}`;
const taxYear = `${countryId}${year}`;

////////////////////////////////////////
// Export Schemas & Types

export const Year = toType(year); export type Year = Static<typeof Year>;
export const CountryId = toType(countryId); export type CountryId = Static<typeof CountryId>;
export const TaxYear = toType(taxYear); export type TaxYear = Static<typeof TaxYear>;

export const Account = toType(account); export type Account = Static<typeof Account>;
export const Amount = toType(amount); export type Amount = Static<typeof Amount>;
export const App = toType(alphanum); export type App = Static<typeof App>;
export const Asset = toType(alphanumish); export type Asset = Static<typeof Asset>;
export const Bytes32 = toType(bytes32); export type Bytes32 = Static<typeof Bytes32>;
export const DecString = toType(decimal); export type DecString = Static<typeof DecString>;
export const Digest = toType(digest); export type Digest = Static<typeof Digest>;
// export const EvmAddress = toType(evmAddress); export type EvmAddress = Static<typeof EvmAddress>;
export const Guard = toType(guard); export type Guard = Static<typeof Guard>;
export const HexString = toType(hexstring); export type HexString = Static<typeof HexString>;
export const IntString = toType(integer); export type IntString = Static<typeof IntString>;
export const Method = toType(words); export type Method = Static<typeof Method>;
export const Source = toType(alphanum); export type Source = Static<typeof Source>;
export const TxId = toType(txid); export type TxId = Static<typeof TxId>;

export const DateString = Type.String({ format: "date" });
export type DateString = Static<typeof DateString>;
export const DateTimeString = Type.String({ format: "date-time" });
export type DateTimeString = Static<typeof DateTimeString>;
