import {
  EvmApps,
} from "@valuemachine/transactions";
import {
  Account,
  Asset,
  AssetChunk,
  Balances,
  ChunkIndex,
  DecimalString,
  Events,
  EventTypes,
  HydratedAssetChunk,
  HydratedEvent,
  OutgoingTransfers,
  StoreKeys,
  TradeEvent,
  DebtEvent,
  Transaction,
  TransferCategories,
  ValueMachine,
  ValueMachineParams,
} from "@valuemachine/types";
import {
  abs,
  add,
  eq,
  getEmptyValueMachine,
  getLogger,
  getValueMachineError,
  gt,
  lt,
  mul,
  sub,
} from "@valuemachine/utils";

import { sumChunks, sumTransfers, diffBalances } from "./utils";

const {
  Internal, Income, SwapIn, Borrow, Expense, Fee, SwapOut, Repay, Refund
} = TransferCategories;

// Fixes apps that provide insufficient info in tx logs to determine interest income eg DSR
// Withdrawing more than we deposited is assumed to represent income rather than a loan
const isIncomeSource = (account: Account): boolean =>
  account.startsWith(`${EvmApps.Maker}-DSR`) ||
  account.startsWith(`${EvmApps.Tornado}`);

export const getValueMachine = (params?: ValueMachineParams): ValueMachine => {
  const { logger, store, json: vmJson } = params || {};

  const log = (logger || getLogger()).child({ module: "ValueMachine" });
  const json = vmJson || store?.load(StoreKeys.ValueMachine) || getEmptyValueMachine();
  const save = (): void => store?.save(StoreKeys.ValueMachine, json);

  const error = getValueMachineError(json);
  if (error) throw new Error(error);

  let newEvents = [] as Events; // index will be added when we add new events to total
  let tmpChunks = [] as AssetChunk[]; // for inter-tx underflows arising from out of order transfers

  ////////////////////////////////////////
  // Simple Utils

  const toIndex = (chunk: AssetChunk): ChunkIndex => chunk.index;
  const fromIndex = (chunkIndex: ChunkIndex): AssetChunk => json.chunks[chunkIndex];

  const isHeld = (account: Account, asset: Asset) => (chunk: AssetChunk): boolean =>
    chunk.account === account && chunk.asset === asset;

  ////////////////////////////////////////
  // Getters

  const getAccounts = (): Account[] => Array.from(json.chunks.reduce((accounts, chunk) => {
    chunk.history.forEach(entry => { accounts.add(entry.account); });
    return accounts;
  }, new Set<string>())).sort();

  const getBalance = (asset: Asset, account?: Account): DecimalString =>
    json.chunks.reduce((balance, chunk) => {
      return (asset && chunk.asset === asset) && ((
        !account && chunk.account
      ) || (
        account && chunk.account === account
      )) ? add(balance, chunk.quantity) : balance;
    }, "0");

  const getChunk = (index: number): HydratedAssetChunk =>
    JSON.parse(JSON.stringify({
      ...json.chunks[index],
      inputs: json.chunks[index]?.inputs?.map(fromIndex) || [],
      outputs: json.chunks[index]?.outputs?.map(fromIndex) || undefined,
    }));

  const getEvent = (index: number): HydratedEvent => {
    const target = json.events[index] as any;
    if (!target) throw new Error(`No event exists at index ${index}`);
    return JSON.parse(JSON.stringify({
      ...target,
      chunks: target?.chunks?.map(fromIndex) || undefined,
      inputs: target?.inputs?.map(fromIndex) || undefined,
      outputs: target?.outputs?.map(fromIndex) || undefined,
    }));
  };

  const getNetWorth = (account?: Account): Balances =>
    json.chunks.reduce((netWorth, chunk) => {
      if (chunk.account && (!account || chunk.account === account)) {
        netWorth[chunk.asset] = add(netWorth[chunk.asset], chunk.quantity);
      }
      return netWorth;
    }, {});

  ////////////////////////////////////////
  // Chunk Manipulators

  const mintChunk = (
    quantity: DecimalString,
    asset: Asset,
    account: Account,
    tmp?: boolean,
  ): AssetChunk => {
    const newChunk = {
      quantity,
      asset,
      account,
      index: json.chunks.length + tmpChunks.length,
      inputs: [],
      history: [{
        date: json.date,
        account,
      }],
    };
    tmp ? tmpChunks.push(newChunk) : json.chunks.push(newChunk);
    return newChunk;
  };

  const borrowChunks = (
    quantity: DecimalString,
    asset: Asset,
    account: Account,
    tmp?: boolean,
  ): AssetChunk[] => {
    log.trace(`Borrowing a ${tmp ? "tmp " : ""}chunk of ${quantity} ${asset} for ${account}`);
    const loan = mintChunk(quantity, asset, account, tmp);
    const debt = mintChunk(mul(quantity, "-1"), asset, account, tmp);
    return [loan, debt];
  };

  const splitChunk = (
    oldChunk: AssetChunk,
    amtNeeded: DecimalString,
  ): AssetChunk[] => {
    const { asset, quantity: total } = oldChunk;
    const leftover = sub(total, amtNeeded);
    // Ensure this new chunk has a completely separate memory allocation
    const newChunk = JSON.parse(JSON.stringify({
      ...oldChunk,
      quantity: amtNeeded,
      index: json.chunks.length,
    }));
    json.chunks.push(newChunk);
    oldChunk.quantity = leftover;
    log.debug(`Split ${asset} chunk of ${total} into ${amtNeeded} and ${leftover}`);
    // Add the new chunk's index alongside the old one anywhere it was referenced
    [...json.events, ...newEvents].forEach((event: any) => {
      if (event.inputs?.includes(oldChunk.index)) { event.inputs.push(newChunk.index); }
      if (event.outputs?.includes(oldChunk.index)) { event.outputs.push(newChunk.index); }
      if (event.chunks?.includes(oldChunk.index)) { event.chunks.push(newChunk.index); }
    });
    json.chunks.forEach(chunk => {
      if (chunk.inputs?.includes(oldChunk.index)) { chunk.inputs.push(newChunk.index); }
      if (chunk.outputs?.includes(oldChunk.index)) { chunk.outputs.push(newChunk.index); }
    });
    return [newChunk, oldChunk];
  };

  const getChunks = (
    quantity: DecimalString,
    asset: Asset,
    account: Account,
  ): AssetChunk[] => {
    const compare = lt(quantity, "0") ? lt : gt;
    // If we're getting a positive quantity, get all held chunks w quantity > 0 else vice versa
    const available = json.chunks
      .filter(isHeld(account, asset))
      .filter(chunk => compare(chunk.quantity, "0"));
    const output = [];
    let togo = quantity;
    for (const chunk of available) {
      if (eq(togo, "0")) {
        return output;
      } else if (compare(chunk.quantity, togo)) { // if we got more than we need, split it up
        const [needed, _leftover] = splitChunk(chunk, togo);
        return [...output, needed];
      }
      output.push(chunk); // if we got less than we need, move on to the next chunk
      togo = sub(togo, chunk.quantity);
    }
    log.error(`No chunks left, we still have ${togo} ${asset} to go!`);
    output.push(underflow(togo, asset, account));
    return output;
  };

  const underflow = (quantity: DecimalString, asset: Asset, account: Account): AssetChunk => {
    if (isIncomeSource(account)) {
      log.warn(`Underflow of ${quantity} ${asset} is being handled as income`);
      const newChunk = mintChunk(quantity, asset, account);
      const newIncomeEvent = newEvents.find(e => e.type === EventTypes.Income);
      if (newIncomeEvent?.type === EventTypes.Income) {
        newIncomeEvent.inputs.push(newChunk.index);
      } else {
        newEvents.push({
          date: json.date,
          index: json.events.length + newEvents.length,
          type: EventTypes.Income,
          inputs: [newChunk.index],
          account,
        });
      }
      return newChunk;
    } else {
      log.warn(`Underflow of ${quantity} ${asset} is being handled by taking out a tmp loan`);
      const [loan, _debt] = borrowChunks(quantity, asset, account, true);
      return loan;
    }
  };

  ////////////////////////////////////////
  // Value Manipulators

  // Returns the newly received chunks
  const receiveValue = (
    quantity: DecimalString,
    asset: Asset,
    account: Account,
  ): AssetChunk[] => {
    log.info(`Receiving ${quantity} ${asset} in ${account}`);
    log.info(tmpChunks, `Checking tmpChunks first`);
    const tmpAvailable = tmpChunks.filter(isHeld(account, asset));
    if (tmpAvailable.length) {
      // If account has any tmp chunks, use those first (& discard any associated debt)
      const tmpBal = sumChunks(tmpAvailable)[asset];
      log.warn(`tmp ${asset} balance: ${tmpBal}`);
      /*
      if (eq(tmpBal, quantity)) {
      } else if (gt(tmpBal, quantity)) {
      } else if (lt(tmpBal, quantity)) {
      }
      */
    }

    const balance = getBalance(asset, account);
    // If account balance is positive, add a new chunk
    if (!lt(balance, "0")) {
      log.debug(`Received new chunk of ${quantity} ${asset} for ${account}`);
      return [mintChunk(quantity, asset, account)];
    } else {
      // If account balance is negative, annihilate debt before maybe adding new chunks
      const disposeDebt = chunk => {
        chunk.disposeDate = json.date;
        chunk.outputs = [];
        delete chunk.account;
      };
      const debt = mul(balance, "-1");
      const available = json.chunks.filter(isHeld(account, asset));
      // If total debt equals what we're receiving, annihilate everything available
      if (eq(debt, quantity)) {
        available.forEach(disposeDebt);
        log.debug(`Repayed all debt of ${quantity} ${asset}`);
        return available;
      // If total debt is bigger than what we're receiving, annihilate what we can
      } else if (lt(quantity, debt)) {
        log.debug(`Repayed debt of ${quantity} ${asset}`);
        const toPay = getChunks(mul(quantity, "-1"), asset, account);
        toPay.forEach(disposeDebt);
        return toPay;
      // If total debt is smaller than what we're receiving, annihilate debt & mint the remainer
      } else if (gt(quantity, debt)) {
        available.forEach(disposeDebt);
        const togo = sub(quantity, debt);
        const newChunk = mintChunk(togo, asset, account);
        log.debug(`Repayed debt of ${debt} ${asset} & minted new chunk of ${togo} ${asset}`);
        return [...available, newChunk];
      }
    }
    log.warn(`How did we get here?!`);
    return [];
  };

  // Returns the chunks we disposed of
  const disposeValue = (
    quantity: DecimalString,
    asset: Asset,
    account: Account,
  ): AssetChunk[] => {
    log.info(`Disposing of ${quantity} ${asset} from ${account}`);
    const disposeChunk = chunk => {
      chunk.disposeDate = json.date;
      chunk.outputs = [];
      delete chunk.account;
    };
    const balance = getBalance(asset, account);
    // If balance is negative, borrow a chunk & dispose of it
    if (lt(balance, "0")) {
      const [loan, _debt] = borrowChunks(quantity, asset, account);
      log.debug(`Borrowing & disposing ${quantity} ${asset} from ${account}`);
      disposeChunk(loan);
      return [loan];
    } 
    // If balance is positive, dispose positive chunks before maybe taking a loan
    const available = json.chunks.filter(isHeld(account, asset));
    if (eq(balance, quantity)) {
      available.forEach(disposeChunk);
      log.debug(`Disposed full balance of ${
        available.map(c => c.quantity).join(" + ")
      } ${asset} from ${account}`);
      return available;
    } else if (gt(balance, quantity)) {
      const toDispose = getChunks(quantity, asset, account);
      toDispose.forEach(disposeChunk);
      log.debug(`Disposed of ${
        toDispose.map(c => c.quantity).join(" + ")
      } ${asset} from ${account}`);
      return toDispose;
    } else if (lt(balance, quantity)) {
      available.forEach(disposeChunk);
      const togo = sub(quantity, balance);
      const rest = underflow(togo, asset, account);
      disposeChunk(rest);
      log.debug(`Disposed of all ${asset} from ${account} and underflowed by ${rest.quantity}`);
      return [...available, rest];
    }
    log.warn(`How did we get here?!`);
    return [];
  };

  const tradeValue = (account: Account, swapsIn: Balances, swapsOut: Balances): void => {
    log.info(`Trading ${JSON.stringify(swapsOut)} for ${JSON.stringify(swapsIn)}`);
    const chunksOut = [] as AssetChunk[];
    for (const swapOut of Object.entries(swapsOut)) {
      const asset = swapOut[0] as Asset;
      const quantity = swapOut[1] as DecimalString;
      chunksOut.push(...disposeValue(quantity, asset, account));
    }
    const chunksIn = [] as AssetChunk[];
    for (const swapIn of Object.entries(swapsIn)) {
      const asset = swapIn[0] as Asset;
      const quantity = swapIn[1] as DecimalString;
      chunksIn.push(...receiveValue(quantity, asset, account));
    }
    // Set indicies of trade input & output chunks
    chunksOut.forEach(chunk => { chunk.outputs = chunksIn.map(toIndex); });
    chunksIn.forEach(chunk => { chunk.inputs = chunksOut.map(toIndex); });
    // emit trade event
    newEvents.push({
      date: json.date,
      index: json.events.length + newEvents.length,
      type: EventTypes.Trade,
      inputs: chunksIn.map(toIndex),
      outputs: chunksOut.map(toIndex),
      account,
    } as TradeEvent);
  };

  const moveValue = (quantity: DecimalString, asset: Asset, from: Account, to: Account): void => {
    log.info(`Moving ${quantity} ${asset} from ${from} to ${to}`);
    const toMove = getChunks(quantity, asset, from);
    toMove.forEach(chunk => {
      chunk.account = to;
      const prev = chunk.history[chunk.history.length - 1];
      if (prev.account === from && prev.account !== to) {
        chunk.history.push({ date: json.date, account: to });
      } else if (prev.account !== from && prev.account !== to) {
        log.warn(`chunk ${chunk.index} is being moved from ${
          from
        } but the prev history entry is: ${JSON.stringify(prev)}`);
        chunk.history.push({ date: json.date, account: to });
      } else if (prev.account !== from && prev.account === to) {
        log.warn(`chunk ${chunk.index} is being moved to ${
          to
        } but the prev history entry is already: ${JSON.stringify(prev)}`);
      }
    });
    // Handle guard change
    if (to.split("/")[0] !== from.split("/")[0]) {
      newEvents.push({
        date: json.date,
        index: json.events.length + newEvents.length,
        from: from,
        to: to,
        chunks: toMove.map(toIndex),
        insecurePath: [],
        type: EventTypes.GuardChange,
      });
    }
  };

  // returns the new borrowed + debt chunks
  const borrowValue = (
    quantity: DecimalString,
    asset: Asset,
    account: Account,
  ): AssetChunk[] => {
    log.debug(`Borrowing ${quantity} ${asset} via account ${account}`);
    const loan = borrowChunks(quantity, asset, account);
    log.info(loan, `Borrowed chunks`);
    newEvents.push({
      date: json.date,
      index: json.events.length + newEvents.length,
      type: EventTypes.Debt,
      inputs: loan.map(toIndex),
      outputs: [],
      account,
    } as DebtEvent);
    return loan;
  };

  // returns the annihilated debt + repayment chunks
  const repayValue = (
    quantity: DecimalString,
    asset: Asset,
    account: Account,
  ): AssetChunk[] => {
    log.info(`Repaying ${quantity} ${asset} via account ${account}`);
    log.info(getNetWorth(account), `Account balance for ${account}`);
    const held = json.chunks.filter(isHeld(account, asset));
    const positiveChunks = held.filter(chunk => gt(chunk.quantity, "0"));
    const negativeChunks = held.filter(chunk => lt(chunk.quantity, "0"));
    const positiveBalance = positiveChunks.reduce((acc, cur) => add(acc, cur.quantity), "0");
    const negativeBalance = negativeChunks.reduce((acc, cur) => add(acc, cur.quantity), "0");
    if (lt(positiveBalance, quantity)) {
      log.warn(`Account ${account} has insufficent funds for repayment of ${quantity} ${asset}`);
    }
    if (lt(abs(negativeBalance), quantity)) {
      log.warn(`Account ${account} has insufficent debt for repayment of ${quantity} ${asset}`);
    }
    const toRepayWith = getChunks(quantity, asset, account);
    const toAnnihilate = getChunks(mul(quantity, "-1"), asset, account);
    log.info(toRepayWith, `Using the following chunks to repay ${quantity} ${asset}`);
    log.info(toAnnihilate, `Disposing of the following debt chunks`);
    const disposeChunk = chunk => {
      chunk.disposeDate = json.date;
      chunk.outputs = [];
      delete chunk.account;
    };
    toRepayWith.forEach(disposeChunk);
    toAnnihilate.forEach(disposeChunk);
    const outputs = [...toRepayWith, ...toAnnihilate];
    newEvents.push({
      date: json.date,
      index: json.events.length + newEvents.length,
      type: EventTypes.Debt,
      inputs: [],
      outputs: outputs.map(toIndex),
      account,
    } as DebtEvent);
    return outputs;
  };

  ////////////////////////////////////////
  // Transaction Processor

  const execute = (tx: Transaction): Events => {
    log.debug(`Processing transaction ${tx.index} from ${tx.date}`);
    json.date = tx.date;
    newEvents = [];
    tmpChunks = [];

    // Create a new copy of transfers that we can modify in-place
    const transfers = JSON.parse(JSON.stringify(tx.transfers));

    // Subtract refunds from associated outgoing transfers
    const refunds = transfers.filter(transfer => transfer.category === Refund);
    if (refunds.length) {
      refunds.forEach(refund => {
        const refunded = transfers.find(transfer =>
          transfer.asset === refund.asset &&
          refund.from === transfer.to &&
          Object.keys(OutgoingTransfers).includes(transfer.category) &&
          lt(refund.quantity, transfer.quantity)
        );
        if (refunded) {
          log.info(`Subtracting refund of ${refund.quantity} ${
            refund.asset
          } from ${refunded.category} of ${refunded.quantity} ${refunded.asset}`);
          refunded.quantity = sub(refunded.quantity, refund.quantity);
        } else {
          log.warn(`Can't find matching transfer for refund of ${
            refund.quantity
          } ${refund.asset} from ${refund.from}, treating it as income`);
          refund.category = Income;
        }
      });
    }

    // If we have mismatched swap transfers, treat them as income/expenses
    const swapsIn = transfers.filter(transfer => transfer.category === SwapIn);
    const swapsOut = transfers.filter(transfer => transfer.category === SwapOut);
    if (swapsIn.length && !swapsOut.length) {
      swapsIn.forEach(swap => { swap.category = Income; });
    } else if (swapsOut.length && !swapsIn.length) {
      swapsOut.forEach(swap => { swap.category = Expense; });
    // If we have matching swap transfers, process the trade first
    } else if (swapsOut.length && swapsIn.length) {
      const account = swapsIn[0].to || swapsOut[0].from;
      if (
        // All self accounts should be the same in all swap transfers
        !swapsIn.every(swap => swap.to === account) ||
        !swapsOut.every(swap => swap.from === account)
      ) {
        // TODO: how do we handle when to/from values aren't consistent among swap transfers?
        // eg add a synthetic internal transfer to ensure the trade only involve one account?
        const message = `Assets moved accounts mid-trade, assuming the account was ${account}`;
        log.warn(message);
        newEvents.push({
          index: json.events.length + newEvents.length,
          date: json.date,
          message,
          type: EventTypes.Error,
        });
      }
      // Sum transfers & subtract duplicates to get total values traded
      const [inputs, outputs] = diffBalances([sumTransfers(swapsIn), sumTransfers(swapsOut)]);
      tradeValue(account, inputs, outputs);
    }

    // Process all non-swap & non-refund transfers
    transfers.forEach(transfer => {
      const { asset, category, from, quantity, to } = transfer;
      if (category === Borrow) {
        borrowValue(quantity, asset, to);
      } else if (category === Repay) {
        repayValue(quantity, asset, from);
      } else if (category === Internal) {
        moveValue(quantity, asset, from, to);
      } else if (category === Fee) {
        // Fees should be handled w/out emitting an event
        disposeValue(quantity, asset, from);
      // Send funds out of our accounts
      } else if (category === Expense) {
        const disposed = disposeValue(quantity, asset, from);
        newEvents.push({
          account: from,
          index: json.events.length + newEvents.length,
          date: json.date,
          outputs: disposed.map(toIndex),
          type: EventTypes.Expense,
        });
      // Receive funds into one of our accounts
      } else if (category === Income) {
        const received = receiveValue(quantity, asset, to);
        newEvents.push({
          account: to,
          index: json.events.length + newEvents.length,
          date: json.date,
          inputs: received.map(toIndex),
          type: EventTypes.Income,
        });
      } else {
        log.debug(`Skipping transfer of type ${category}`);
      }
    });

    // Finalize tmp chunks??
    for (const tmpChunk of tmpChunks) { json.chunks.push(tmpChunk); }
    if (tmpChunks.length) {
      log.warn(tmpChunks, `We have tmp chunks leftover`);
      newEvents.push({
        index: json.events.length + newEvents.length,
        date: json.date,
        message: "We have temporary chunks leftover",
        type: EventTypes.Error,
      });
    }

    // Finalize new events
    for (const newEvent of newEvents) {
      json.events.push(newEvent);
    }

    return newEvents;
  };

  return {
    execute,
    getAccounts,
    getBalance,
    getChunk,
    getEvent,
    getNetWorth,
    json,
    save,
  };
};
