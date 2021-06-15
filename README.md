
# Value Machine

The value machine is a set of tools for in-depth analysis of an individual's financial portfolio and tax obligations.

These tools are **jurisdiction-neutral** ie there is zero business logic that is specific to any country's particular tax system.

To calculate the capital gains & losses for an eth address:

```typescript
import { getPrice, getValueMachine } from "@valuemachine/core";
import { getAddressBook, getChainData, getTransactions } from "@valuemachine/transactions";
import { AddressCategories } from "@valuemachine/types";
import { mul, round, sub } from "@valuemachine/utils";

(async () => {

  // Gather & categorize the addresses we want to analyze
  const addressBookJson = [{
    address: "0x1057bea69c9add11c6e3de296866aff98366cfe3",
    category: AddressCategories.Self, // this is a string of the key name so just "Self" is fine too
    name: "bohendo.eth",
  }];
  const addressBook = getAddressBook(addressBookJson);

  // Fetch tx history and receipts from etherscan
  const chainData = getChainData();
  await chainData.syncAddresses(addressBook.addresses);

  // Convert eth chain data into transactions
  const transactions = getTransactions({ addressBook });
  transactions.mergeEthereum(chainData);

  // Create a value machine & process our transactions
  const vm = getValueMachine({ addressBook });
  for (const transaction of transactions.getJson()) {
    vm.execute(transaction);
  }

  // Create a price fetcher & fetch the relevant prices
  const unit = "USD";
  const prices = getPrices({ unit });
  for (const transaction of transactions.getJson()) {
    await prices.syncTransaction(transactions);
  }

  // calculate & print capital gains
  const capChange = "0";
  for (const event of vm.getJson().events) {
    if (event.type === EventTypes.Trade) {
      const change = "0";
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

})()

```
