import { toUtf8Bytes } from "@ethersproject/strings";
import { keccak256 } from "@ethersproject/keccak256";
import {
  Account,
  Amount,
  Asset,
  Bytes32,
  DateString,
  DateTimeString,
  DecString,
  TxId,
} from "@valuemachine/types";

import { ajv, formatErrors } from "./validate";

export const digest = (data: string) => keccak256(toUtf8Bytes(data)).substring(2, 10);

export const slugify = str =>
  str.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/--/g, "-").replace(/(^-|-$)/, "");

const validateAccount = ajv.compile(Account);
export const getAccountError = (val: Account): string => validateAccount(val) ? ""
  : validateAccount.errors.length ? formatErrors(validateAccount.errors)
  : `Invalid Account: ${JSON.stringify(val)}`;

const validateAmount = ajv.compile(Amount);
export const getAmountError = (val: Amount): string => validateAmount(val) ? ""
  : validateAmount.errors.length ? formatErrors(validateAmount.errors)
  : `Invalid Amount: ${JSON.stringify(val)}`;

const validateAsset = ajv.compile(Asset);
export const getAssetError = (val: Asset): string => validateAsset(val) ? ""
  : validateAsset.errors.length ? formatErrors(validateAsset.errors)
  : `Invalid Asset: ${JSON.stringify(val)}`;

const validateDateTime = ajv.compile(DateTimeString);
export const getDateTimeError = (val: DateTimeString): string => validateDateTime(val) ? ""
  : validateDateTime.errors.length ? formatErrors(validateDateTime.errors)
  : `Invalid DateTime: ${JSON.stringify(val)}`;

const validateDate = ajv.compile(DateString);
export const getDateError = (val: DateString): string => validateDate(val) ? ""
  : validateDate.errors.length ? formatErrors(validateDate.errors)
  : `Invalid Date: ${JSON.stringify(val)}`;

const validateDecString = ajv.compile(DecString);
export const getDecStringError = (val: DecString): string => validateDecString(val) ? ""
  : validateDecString.errors.length ? formatErrors(validateDecString.errors)
  : `Invalid DecString: ${JSON.stringify(val)}`;

const validateBytes32 = ajv.compile(Bytes32);
export const getBytes32Error = (address: Bytes32): string => validateBytes32(address) ? ""
  : validateBytes32.errors.length ? formatErrors(validateBytes32.errors)
  : `Invalid Bytes32: ${JSON.stringify(address)}`;

const validateTxId = ajv.compile(TxId);
export const getTxIdError = (txId: TxId): string => validateTxId(txId) ? ""
  : validateTxId.errors.length ? formatErrors(validateTxId.errors)
  : `Invalid TxId: ${JSON.stringify(txId)}`;
