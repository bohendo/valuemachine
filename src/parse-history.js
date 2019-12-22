const csv = require('csv-parse/lib/sync');
const fs = require('fs');

const { add, mul, diff } = require("./math");

const year = require('../package.json').year
const personal = require(`${process.cwd()}/${process.argv[2]}`);

const getTimestamp = (date) => {
  const year = date.getFullYear().toString().substring(2,4);
  const month = date.getMonth().toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
}

const parseCoinbase = (filename) => {
  const rawFile = fs.readFileSync(filename, 'utf8').split('\n');
  return csv(
    rawFile.slice(3, rawFile.length).join('\n'),
    { columns: true, skip_empty_lines: true },
  ).map(row => {
    const valueUsd = row["USD Amount Transacted (Inclusive of Coinbase Fees)"];
    const valueAsset = mul(row["USD Spot Price at Transaction"], row["Quantity Transacted"]);
    return ({
      timestamp: getTimestamp(new Date(row["Timestamp"])),
      asset: row["Asset"],
      quantitiy: row["Quantity Transacted"],
      price: row["USD Spot Price at Transaction"],
      from: row["Transaction Type"] === "Buy" ? "ex-coinbase" : "self",
      to: row["Transaction Type"] === "Sell" ? "ex-coinbase" : "self",
      valueIn: row["Transaction Type"] === "Buy" ? valueAsset : valueUsd,
      valueOut: row["Transaction Type"] === "Sell" ? valueAsset : valueUsd,
      fee: diff(valueAsset, valueUsd),
    });
  });
}

const parseWyre = (filename) => {
  const rawFile = fs.readFileSync(filename, 'utf8').split('\n');
  return csv(
    rawFile.slice(3, rawFile.length).join('\n'),
    { columns: true, skip_empty_lines: true },
  ).map(row => {
    return ({
      timestamp: getTimestamp(new Date(row["Created At"])),
      asset: row["Source Currency"],
      quantitiy: row["Source Amount"],
      price: row["Exchange Rate"],
      from: row["Type"] == "INCOMING" ? "ex-wyre" : "self",
      to: row["Type"] == "OUTGOING" ? "ex-wyre" : "self",
      valueIn: row["Dest Amount"],
      valueOut: add(row["Source Amount"], row["Exchange Rate"]),
      fee: row["Fees USD"]
    });
  });
}

const parseHistory = (historyFilenames) => {
  const allHistory = [];
  for (const historyFilename of historyFilenames) {
    if (historyFilename.includes('coinbase')) {
      console.log('Parsed Coinbase History:', parseCoinbase(historyFilename));
      allHistory.push(...parseCoinbase(historyFilename))
    } else if (historyFilename.includes('wyre')) {
      // console.log('Parsed Wyre History:', parseWyre(historyFilename));
      allHistory.push(...parseWyre(historyFilename))
    } else {
      console.log(`No parser available for this history format, skipping: ${historyFilename}`);
    }
  }
}

parseHistory(personal.txHistory);
