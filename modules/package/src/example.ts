import fs from "fs";
import path from "path";

import {
  getAddressBook,
  getChainData,
  getPrices,
  getTransactions, 
  getValueMachine,
  types,
  utils,
} from "."; // replace "." with "valuemachine" in your code

const { getFileStore, getLogger, mul, round, sub } = utils;
const { AddressCategories, EventTypes } = types;
const logger = getLogger("info");

// store the data we download & generate on the filesystem
const store = getFileStore(path.join(__dirname, "../exampleData"), fs);

// Gather & categorize the addresses we want to analyze
const addressBookJson = [{
  address: "0x1057bea69c9add11c6e3de296866aff98366cfe3",
  category: AddressCategories.Self, // this is a string of the key name so just "Self" is fine too
  name: "bohendo.eth",
}];
const addressBook = getAddressBook({ json: addressBookJson, logger });

// We'll be making network calls to get chain data & prices so switch to async mode
(async () => {

  // Fetch tx history and receipts from etherscan
  const chainData = getChainData({ logger, store });
  await chainData.syncAddresses(
    addressBook.addresses.filter(a => addressBook.isSelf(a))
  );

  // Convert eth chain data into transactions
  const transactions = getTransactions({ addressBook, logger });
  transactions.mergeEthereum(chainData);

  // Create a value machine & process our transactions
  const vm = getValueMachine({ addressBook, logger });
  for (const transaction of transactions.json) {
    vm.execute(transaction);
  }

  // Create a price fetcher & fetch the relevant prices
  const unit = "USD";
  const prices = getPrices({ logger, store, unit });
  for (const transaction of transactions.json) {
    await prices.syncTransaction(transaction);
  }

  // calculate & print capital gains
  for (const event of vm.json.events) {
    if (event.type === EventTypes.Trade) {
      event.outputs.forEach(chunkIndex => {
        const chunk = vm.getChunk(chunkIndex);
        const takePrice = prices.getPrice(chunk.receiveDate, chunk.asset);
        const givePrice = prices.getPrice(chunk.disposeDate, chunk.asset);
        const change = mul(chunk.quantity, sub(givePrice, takePrice));
        console.log(`${
          addressBook.getName(event.account)
        } got a chunk of ${
          round(chunk.quantity, 4)
        } ${
          chunk.asset
        } on ${
          chunk.receiveDate
        } and gave it away on ${
          chunk.disposeDate
        } for a capital change of ${
          round(change, 2)
        } ${
          unit
        }`);
      });
    }
  }

})();
