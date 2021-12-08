import fs from "fs";
import path from "path";

import {
  AddressCategories,
  EventTypes,
  getAddressBook,
  getEthereumData,
  getFileStore,
  getLogger,
  getPrices,
  getTransactions,
  getValueMachine,
  math,
} from "."; // replace "." with "valuemachine" in your code

const logger = getLogger("info");

// store the data we download & generate on the filesystem
const store = getFileStore(path.join(__dirname, "../exampleData"), fs);

// Gather & categorize the addresses we want to analyze
const address = "Ethereum/0x8dD2470FA76bfEd24b7ef69a83F0063A6C03cA3f";
const addressBookJson = {
  [address]: { address, category: AddressCategories.Self, name: "bohendo.argent.xyz" },
};
const addressBook = getAddressBook({ json: addressBookJson, logger });

// Get tools for gathering & processing transactions
const transactions = getTransactions({ logger });

// We'll be making network calls to get chain data & prices so switch to async mode
(async () => {

  // Get chain data management tools
  const chainData = getEthereumData({
    etherscanKey: process.env.ETHERSCAN_KEY,
    json: store.load("EthereumData"),
    logger,
    save: val => store.save("EthereumData", val),
  });

  // Fetch eth chain data, this can take a while
  await chainData.syncAddressBook(addressBook);

  // Parse data into transactions and add them to the list
  transactions.merge(chainData.getTransactions(addressBook));

  // Create a value machine & process our transactions
  const vm = getValueMachine({ logger });
  for (const transaction of transactions.json) {
    vm.execute(transaction);
  }

  // Create a price fetcher & fetch the relevant prices
  const unit = "USD";
  const prices = getPrices({
    json: store.load("Prices"),
    logger,
    save: val => store.save("Prices", val),
    unit,
  });
  for (const chunk of vm.json.chunks) {
    const { asset, history, disposeDate } = chunk;
    for (const date of [history[0]?.date, disposeDate]) {
      if (!date) continue;
      await prices.syncPrice(date, asset);
    }
  }

  // calculate & print capital gains
  console.log(`    Amount |        Asset | Receive Date | Dispose Date | Capital Change (USD)`);
  for (const event of vm.json.events) {
    switch(event.type) {
    case EventTypes.Trade: {
      event.outputs.forEach(chunkIndex => {
        const chunk = vm.getChunk(chunkIndex);
        const takePrice = prices.getNearest(chunk.history[0]?.date, chunk.asset);
        const givePrice = prices.getNearest(chunk.disposeDate, chunk.asset);
        if (!takePrice || !givePrice) return;
        const change = math.mul(chunk.amount, math.sub(givePrice, takePrice));
        console.log(`${
          math.round(chunk.amount, 4).padStart(12, " ")
        } | ${
          chunk.asset.padStart(12, " ")
        } | ${
          chunk.history[0]?.date.split("T")[0].padStart(12, " ")
        } | ${
          chunk.disposeDate.split("T")[0].padStart(12, " ")
        } | ${
          math.round(change, 2)
        }`);
      });
    }
    }
  }

})();
