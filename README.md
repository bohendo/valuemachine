
# Value Machine

The value machine is a set of tools for in-depth analysis of an individual's financial portfolio and tax obligations.

These tools are **jurisdiction-neutral** ie there is zero business logic that is specific to any country's particular tax system.

## Example Usage

Launch the dashboard with: `make start`

To calculate the capital gains & losses for an eth address, import the `valuemachine` library & use it like:

```typescript
import fs from "fs";
import path from "path";

import {
  AddressCategories,
  EventTypes,
  getAddressBook,
  getEthereumData,
  getFileStore,
  getLogger,
  getPriceFns,
  getTransactions,
  getValueMachine,
  math,
} from "valuemachine";

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
  const prices = getPriceFns({
    logger,
    unit,
  });
  prices.calcPrices(vm);

  // calculate & print capital gains
  console.log(`      Amount |        Asset | Receive Date | Dispose Date | Capital Change (USD)`);
  for (const event of vm.json.events) {
    switch(event.type) {
    case EventTypes.Trade: {
      event.outputs.forEach(chunkIndex => {
        const chunk = vm.getChunk(chunkIndex);
        const takePrice = (prices.getPrice(chunk.history[0]?.date, chunk.asset) || 0).toString();
        const givePrice = (prices.getPrice(chunk.disposeDate, chunk.asset) || 0).toString();
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
```

## Address Categories

The most important distinction between accounts

## Transfer Categories

```
export const TransferCategories = {
  Internal: "Internal", // generic self -> self transfer
  Deposit: "Deposit", // self chain-address account (eg `0xabc123`) -> self abstract account (eg `Maker-CDP-123`)
  Withdraw: "Withdraw", // self abstract account -> self chain-address account
  Income: "Income", // external -> self account
  Expense: "Expense", // self account -> external
  SwapIn: "SwapIn", // external -> self account (vm pairs these w SwapOut transfers to detect trades)
  SwapOut: "SwapOut", // self account -> external (paired with SwapIn transfers)
  Borrow: "Borrow", // external -> self account (vm also creates equal & opposite debt for the receiving account)
  Repay: "Repay", // self account -> external (vm also annihilates an equal amount of debt)
  Unknown: "Unknown", // error: given the address book we should at least be able to sort into income/expense/internal
} as const;
```
