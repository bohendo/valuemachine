import {
  AddressBook,
  AddressCategories,
  CsvFiles,
  getTransactions,
  Transactions,
  TransactionsJson,
} from "@valuemachine/transactions";
import { getLogger } from "@valuemachine/utils";
import axios from "axios";

const logger = getLogger("warn");

export const syncTxns = async ({
  addressBook,
  csvFiles,
  customTxns,
  setSyncMsg,
  setTransactionsJson,
}: {
  addressBook: AddressBook;
  csvFiles: CsvFiles;
  customTxns: TransactionsJson;
  setSyncMsg?: (val: string) => void;
  setTransactionsJson?: (val: TransactionsJson) => void;
}): Promise<Transactions> => {
  // Sync Chain Data
  const newTransactions = getTransactions({
    json: JSON.parse(JSON.stringify(customTxns)),
    logger,
  });
  const selfAddresses = Object.values(addressBook.json).filter(e =>
    e.category === AddressCategories.Self
  );
  if (selfAddresses?.length) {
    let isEthSynced = false;
    let isPolygonSynced = false;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        if (!isEthSynced) {
          setSyncMsg?.(`Syncing Ethereum data for ${selfAddresses.length} addresses`);
          const resE = await axios.post("/api/ethereum", {
            addressBook: addressBook.json
          }) as any;
          console.log(`Got ${resE.data.length} Eth transactions:`, resE.data);
          if (resE.status === 200 && typeof(resE.data) === "object") {
            newTransactions.merge(resE.data);
            isEthSynced = true;
          } else {
            await new Promise((res) => setTimeout(res, 10000));
            continue;
          }
        }
        if (!isPolygonSynced) {
          setSyncMsg?.(`Syncing Polygon data for ${selfAddresses.length} addresses`);
          const resP = await axios.post("/api/polygon", {
            addressBook: addressBook.json
          }) as any;
          console.log(`Got ${resP.data.length} Polygon transactions:`, resP.data);
          if (resP.status === 200 && typeof(resP.data) === "object") {
            newTransactions.merge(resP.data);
            isPolygonSynced = true;
          } else {
            console.warn(`Unsuccessful response: code=${resP.status} resType=${typeof resP.data}`);
            await new Promise((res) => setTimeout(res, 10000));
            continue;
          }
        }
        break;
      } catch (e) {
        console.warn(e);
        await new Promise((res) => setTimeout(res, 10000));
      }
    }
  }
  for (const csv of Object.values(csvFiles)) {
    setSyncMsg?.(`Parsing ${
      csv.data.split("\n").length - 1
    } rows of ${csv.source} data from ${csv.name}`);
    await new Promise((res) => setTimeout(res, 10)); // let sync message re-render
    newTransactions.mergeCsv(csv.data);
  }
  setTransactionsJson?.(newTransactions.json);
  setSyncMsg?.("");
  return (newTransactions);
};
