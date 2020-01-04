import csv from 'csv-parse/lib/sync';
import fs from 'fs';

import { TaxableTx, InputData } from "../types";
import { diff, add, sub, round, mul, eq, gt, lt } from './math';

const shouldWarn = false

const getTimestamp = (date: Date): string => {
  if (isNaN(date.getFullYear())) {
    return '';
  }
  const year = date.getFullYear().toString().substring(2,4);
  const month = date.getMonth().toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
}

const parseCoinbase = (filename: string, personal: InputData): TaxableTx[] => {
  const rawFile = fs.readFileSync(filename, 'utf8').split('\r\n');
  return csv(
    rawFile.slice(3, rawFile.length).join('\r\n'),
    { columns: true, skip_empty_lines: true },
  ).map(row => {
    const valueUsd = row["USD Amount Transacted (Inclusive of Coinbase Fees)"];
    const valueAsset = mul(row["USD Spot Price at Transaction"], row["Quantity Transacted"]);
    return ({
      timestamp: getTimestamp(new Date(row["Timestamp"])),
      asset: row["Asset"],
      quantity: row["Quantity Transacted"],
      price: row["USD Spot Price at Transaction"],
      from: row["Transaction Type"] === "Buy" ? "ex-coinbase" : "self",
      to: row["Transaction Type"] === "Sell" ? "ex-coinbase" : "self",
      valueIn: row["Transaction Type"] === "Buy" ? valueAsset : valueUsd,
      valueOut: row["Transaction Type"] === "Sell" ? valueAsset : valueUsd,
      fee: diff(valueAsset, valueUsd),
    });
  });
}

const parseWyre = (filename: string, personal: InputData): TaxableTx[] => {
  return csv(
    fs.readFileSync(filename, 'utf8'),
    { columns: true, skip_empty_lines: true },
  ).map(row => {
    // Ignore any rows with an invalid timestamp
    if (!getTimestamp(new Date(row["Created At"]))) return null;
    // Ignore any transfers into Wyre account
    if (row["Source Currency"] === row["Dest Currency"]) return null;
    return ({
      timestamp: getTimestamp(new Date(row["Created At"])),
      asset: row["Source Currency"],
      quantity: row["Source Amount"],
      price: row["Exchange Rate"],
      from: row["Type"] === "INCOMING" ? "ex-wyre" : "self",
      to: row["Type"] === "OUTGOING" ? "ex-wyre" : "self",
      valueIn: row["Dest Amount"],
      valueOut: add([row["Source Amount"], row["Exchange Rate"]]),
      fee: row["Fees USD"] || "0" // TODO: deal w fees charged in other currencies
    });
  }).filter(row => !!row);
}

const parseEtherscan = (filename: string, personal: InputData): TaxableTx[] => {
  const hasWarned = [];
  const rawFile = fs.readFileSync(filename, 'utf8').split('\r\n');
  // Etherscan csv exports have 15 columns labeled but data rows have 16 columns..?
  rawFile[0] = `${rawFile[0]},"?"`;
  return csv(
    rawFile.join('\r\n'),
    { columns: true, skip_empty_lines: true },
  ).map(row => {
    // console.log(`Parsing row:`, row);
    const quantity = add([row["Value_IN(ETH)"], row["Value_OUT(ETH)"]]);
    if (quantity === "0") return null; // TODO: ERC20 txns?!
    let from;
    if (Object.keys(personal.addresses).includes(row["From"].toLowerCase())) {
      from = personal.addresses[row["From"]]
    } else {
      from = row["From"]
      if (shouldWarn && !hasWarned.includes(row["From"])) {
        console.log(`Warning, unknown address: ${row["From"]} (from tx ${row["Txhash"]})`);
        hasWarned.push(row["From"]);
      }
    }
    let to;
    if (Object.keys(personal.addresses).includes(row["To"].toLowerCase())) {
      to = personal.addresses[row["To"]]
    } else {
      to = row["To"]
      if (shouldWarn && !hasWarned.includes(row["To"])) {
        console.log(`Warning, unknown address: ${row["To"]} (from tx ${row["Txhash"]})`);
        hasWarned.push(row["To"]);
      }
    }
    // Skip self-to-self transactions
    if (from.substring(0, 4) === to.substring(0, 4) && from.substring(0, 4) === "self") {
      return null;
    }
    // Skip transactions to/from exchanges, these will be dealt w in the exchange-specific file
    if (from.includes('coinbase') || to.includes('coinbase')) {
      return null;
    }
    const value = mul(quantity, row["Historical $Price/Eth"]);
    return ({
      timestamp: getTimestamp(new Date(parseInt(`${row["UnixTimestamp"]}000`))),
      asset: "ETH",
      quantity,
      price: row["Historical $Price/Eth"],
      from,
      to,
      valueIn: row["Value_OUT(ETH)"] === "0" ? value : "0",
      valueOut: row["Value_IN(ETH)"] === "0" ? value : "0",
      fee: row["TxnFee(USD)"] || '0',
    });
  }).filter(row => !!row);
}

export const parseHistory = (personalData: InputData): TaxableTx[] => {
  const allHistory = [];
  for (const historyFilename of personalData.txHistory || []) {
    if (historyFilename.includes('coinbase')) {
      allHistory.push(...parseCoinbase(historyFilename, personalData))
    } else if (historyFilename.includes('wyre')) {
      allHistory.push(...parseWyre(historyFilename, personalData))
    } else if (historyFilename.includes('etherscan')) {
      // console.log('Parsed etherscan:', parseEtherscan(historyFilename));
      allHistory.push(...parseEtherscan(historyFilename, personalData))
    } else {
      console.log(`No parser available for this history format, skipping: ${historyFilename}`);
    }
  }
  return allHistory.filter(row => row.timestamp.startsWith('19'));
}
