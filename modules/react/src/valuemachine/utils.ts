import {
  ValueMachine,
  getValueMachineError,
  ValueMachineJson,
} from "@valuemachine/core";
import {
  Transactions,
} from "@valuemachine/types";

export const processTxns = async ({
  setSyncMsg,
  setVMJson,
  transactions,
  vm,
}: {
  setSyncMsg?: (val: string) => void;
  setVMJson: (val: ValueMachineJson) => void;
  transactions: Transactions;
  vm: ValueMachine;
}): Promise<ValueMachine> => {

  const newTransactions = transactions?.json?.filter(tx =>
    new Date(tx.date).getTime() > new Date(vm.json.date).getTime(),
  ) || [];

  setSyncMsg?.("Starting..");
  let start = Date.now();
  for (const transaction of newTransactions) {
    if (!transaction) continue;
    vm.execute(transaction);
    const error = getValueMachineError(vm.json);
    if (error) {
      console.warn("chunks:", vm.json.chunks);
      console.warn("events:", vm.json.events);
      throw new Error(error);
    }
    const chunk = 100;
    const gauge = 10;
    if (transaction.index && transaction.index % chunk === 0) start = Date.now();
    if (transaction.index && transaction.index % chunk === gauge) {
      setSyncMsg?.(`Processing txns ${transaction.index - gauge}-${
        transaction.index + chunk - gauge
      } at a rate of ${Math.round((10 * 1000 * gauge)/(Date.now() - start))/10} tx/sec`);
      setVMJson(vm.json);
      start = Date.now();
    }
    await new Promise(res => setTimeout(res, 1)); // Yield to other pending operations
  }
  console.info(`Net Worth: ${JSON.stringify(vm.getNetWorth(), null, 2)}`);
  console.info(`Generated ${vm.json.events.length} events and ${vm.json.chunks.length} chunks`);
  setVMJson({ ...vm.json });
  setSyncMsg?.("Core ValueMachine data is up to date");
  return new Promise(res => {
    setTimeout(() => { setSyncMsg?.(""); res(vm); }, 1000);
  });
};
