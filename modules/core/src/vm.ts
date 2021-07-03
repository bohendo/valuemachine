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
  StoreKeys,
  TradeEvent,
  Transaction,
  TransactionSources,
  Transfer,
  TransferCategories,
  ValueMachine,
  ValueMachineParams,
} from "@valuemachine/types";
import {
  add,
  eq,
  getEmptyValueMachine,
  getLogger,
  getValueMachineError,
  gt,
  lt,
  mul,
  rmDups,
  sub,
} from "@valuemachine/utils";

const {
  Internal, Deposit, Withdraw, Income, SwapIn, Borrow, Expense, SwapOut, Repay,
} = TransferCategories;

// Fixes apps that provide insufficient info in tx logs to determine interest income eg DSR
// Withdrawing more than we deposited is assumed to represent income rather than a loan
const isIncomeSource = (account: Account): boolean =>
  account.startsWith(`${TransactionSources.Maker}-DSR`) ||
  account.startsWith(`${TransactionSources.Tornado}`);

export const getValueMachine = ({
  addressBook,
  logger,
  store,
  json: vmJson,
}: ValueMachineParams): ValueMachine => {
  const log = (logger || getLogger()).child({ module: "ValueMachine" });
  const json = vmJson || store?.load(StoreKeys.ValueMachine) || getEmptyValueMachine();
  const save = (): void => store?.save(StoreKeys.ValueMachine, json);

  const error = getValueMachineError(json);
  if (error) throw new Error(error);

  let newEvents = [] as Events; // index will be added when we add new events to total

  ////////////////////////////////////////
  // Simple Utils

  const toIndex = (chunk: AssetChunk): ChunkIndex => chunk.index;
  const fromIndex = (chunkIndex: ChunkIndex): AssetChunk => json.chunks[chunkIndex];

  const isHeld = (account: Account, asset: Asset) => (chunk: AssetChunk): boolean =>
    chunk.account === account && chunk.asset === asset;

  ////////////////////////////////////////
  // Getters

  const getAccounts = (): Account[] => Array.from(json.chunks.reduce((accounts, chunk) => {
    if (chunk.account) accounts.add(chunk.account);
    return accounts;
  }, new Set<string>()));

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
  ): AssetChunk => {
    const newChunk = {
      quantity,
      asset,
      account,
      index: json.chunks.length,
      inputs: [],
      history: [{
        date: json.date,
        guard: addressBook.getGuard(account),
      }],
    };
    json.chunks.push(newChunk);
    return newChunk;
  };

  const borrowChunks = (quantity: DecimalString, asset: Asset, account: Account): AssetChunk[] => {
    const loan = mintChunk(quantity, asset, account);
    const debt = mintChunk(mul(quantity, "-1"), asset, account);
    return [loan, debt];
  };

  const splitChunk = (
    oldChunk: AssetChunk,
    amtNeeded: DecimalString,
  ): AssetChunk[] => {
    const { asset, quantity: total } = oldChunk;
    const leftover = sub(total, amtNeeded);
    // Make sure this new chunk has a completely separate memory allocation
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
    const balance = getBalance(asset, account);
    const available = json.chunks.filter(isHeld(account, asset));

    // If balance equals what we need, return all available chunks
    if (eq(balance, quantity)) {
      log.debug(`Got all chunks from ${account} for a total of ${quantity} ${asset}`);
      return available;
    }

    const inDebt = lt(balance, "0");
    const needDebt = lt(quantity, "0");

    // Positive balance and we need a positive amount: proceed as usual
    if (!inDebt && !needDebt) {
      // If we don't have enough, give everything we have & underflow
      if (lt(balance, quantity)) {
        const remainder = underflow(quantity, asset, account);
        return [...available, remainder];
      // If we have more chunks than needed, return some of them
      } else {
        const output = [];
        let togo = quantity;
        for (const chunk of available) {
          if (eq(togo, "0")) {
            return output;
          } else if (gt(chunk.quantity, togo)) {
            const [needed, _leftover] = splitChunk(chunk, togo);
            return [...output, needed];
          }
          output.push(chunk);
          togo = sub(togo, chunk.quantity);
        }
        log.error(`No chunks left, we still have ${togo} ${asset} to go!`);
        return output;
      }

    // Negative balance and we need more debt: proceed w signs flipped..??
    } else if (inDebt && needDebt) {
      // If we have more debt than we need, return just some of it
      if (lt(balance, quantity)) {
        const output = [];
        let togo = quantity;
        for (const chunk of available) {
          if (eq(togo, "0")) {
            return output;
          } else if (lt(chunk.quantity, togo)) {
            const [needed, _leftover] = splitChunk(chunk, togo);
            return [...output, needed];
          }
          output.push(chunk);
          togo = sub(togo, chunk.quantity);
        }
        log.error(`No debt left, we still have ${togo} ${asset} to go!`);
        return output;
      // If we have less debt than needed, borrow to make up the difference
      } else {
        const [_loan, debt] = borrowChunks(quantity, asset, account);
        log.warn(`Got all ${asset} debt from ${account} and borrowed ${debt.quantity} more`);
        return [...available, debt];
      }

    // If we're not in debt and want to get a negative quantity, we need some fresh debt
    } else if (!inDebt && needDebt) {
      const [loan, debt] = borrowChunks(quantity, asset, account);
      log.warn(`Borrowed ${loan.quantity} ${loan.asset} bc we needed debt & didn't have any`);
      return [debt];
    // If we're in debt and want to get a positive quantity, we need to go into more debt
    } else if (inDebt && !needDebt) {
      const [loan, _debt] = borrowChunks(quantity, asset, account);
      log.warn(`Borrowed ${loan.quantity} ${loan.asset} bc we're already had ${balance} of debt`);
      return [loan];
    }
    log.warn(`How did we get here?!`);
    return [];
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
          newBalances: {},
        });
      }
      return newChunk;
    } else {
      log.warn(`Underflow of ${quantity} ${asset} is being handled by taking out a loan`);
      const [loan, _debt] = borrowChunks(quantity, asset, account);
      return loan;
    }
  };

  ////////////////////////////////////////
  // Value Manipulators

  // Returns the newly minted chunks and/or the annihilated debt chunks
  const receiveValue = (
    quantity: DecimalString,
    asset: Asset,
    account: Account,
  ): AssetChunk[] => {
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
      newBalances: {},
    } as TradeEvent);
  };

  const moveValue = (quantity: DecimalString, asset: Asset, from: Account, to: Account): void => {
    const toMove = getChunks(quantity, asset, from);
    toMove.forEach(chunk => { chunk.account = to; });
    const oldGuard = addressBook.getGuard(from);
    const newGuard = addressBook.getGuard(to);
    if (newGuard !== oldGuard) {
      toMove.forEach(chunk => { chunk.history.push({
        date: json.date,
        guard: newGuard,
      }); });
      // Handle guard change
      const oldGuard = addressBook.getGuard(from);
      const newGuard = addressBook.getGuard(to);
      newEvents.push({
        date: json.date,
        index: json.events.length + newEvents.length,
        newBalances: {},
        from: from,
        fromGuard: oldGuard,
        to: to,
        toGuard: newGuard,
        chunks: toMove.map(toIndex),
        insecurePath: [],
        type: EventTypes.GuardChange,
      });
    }
  };

  ////////////////////////////////////////
  // Transaction Processor

  const execute = (tx: Transaction): Events => {
    log.debug(`Processing transaction ${tx.index} from ${tx.date}`);
    json.date = tx.date;
    newEvents = []; // reset new events

    const handleTransfer = (
      transfer: Transfer,
    ): void => {
      const { asset, category, from, quantity, to } = transfer;
      // Move funds from one account to another
      if (([Internal, Deposit, Withdraw, Repay, Borrow] as string[]).includes(category)) {
        moveValue(quantity, asset, from, to);
      // Send funds out of our accounts
      } else if (([Expense, SwapOut] as string[]).includes(category)) {
        const disposed = disposeValue(quantity, asset, from);
        newEvents.push({
          account: from,
          index: json.events.length + newEvents.length,
          date: json.date,
          newBalances: {},
          outputs: disposed.map(toIndex),
          type: EventTypes.Expense,
        });
      // Receive funds into one of our accounts
      } else if (([Income, SwapIn] as string[]).includes(category)) {
        const received = receiveValue(quantity, asset, to);
        newEvents.push({
          account: to,
          index: json.events.length + newEvents.length,
          date: json.date,
          inputs: received.map(toIndex),
          newBalances: {},
          type: EventTypes.Income,
        });
      } else {
        log.warn(transfer, `idk how to process this transfer`);
      }
    };

    // Process normal transfers & set swaps aside to process more deeply
    const swapsIn = [];
    const swapsOut = [];
    tx.transfers.forEach(transfer => {
      if (transfer.category === SwapIn) {
        swapsIn.push(transfer);
      } else if (transfer.category === SwapOut) {
        swapsOut.push(transfer);
      } else {
        handleTransfer(transfer);
      }
    });

    // Process Trade
    if (swapsIn.length && swapsOut.length) {
      // Sum transfers & subtract refunds to get total values traded
      const sum = (acc, cur) => add(acc, cur.quantity);
      const assetsOut = rmDups(swapsOut.map(swap => swap.asset));
      const assetsIn = rmDups(swapsIn.map(swap => swap.asset)
        .filter(asset => !assetsOut.includes(asset)) // remove refunds from the output asset list
      );
      const amtsOut = assetsOut.map(asset =>
        swapsIn
          .filter(swap => swap.asset === asset)
          .map(swap => ({ ...swap, quantity: mul(swap.quantity, "-1") })) // subtract refunds
          .concat(
            swapsOut.filter(swap => swap.asset === asset)
          ).reduce(sum, "0")
      );
      const amtsIn = assetsIn.map(asset =>
        swapsIn.filter(swap => swap.asset === asset).reduce(sum, "0")
      );
      const inputs = {};
      assetsIn.forEach((asset, index) => {
        inputs[asset] = amtsIn[index];
      });
      const outputs = {};
      assetsOut.forEach((asset, index) => {
        outputs[asset] = amtsOut[index];
      });
      // TODO: abort or handle when to/from values aren't consistent among swap chunks
      // eg we could add a synthetic internal transfer then make the swap touch only one account
      const account = swapsIn[0].to || swapsOut[0].from;
      tradeValue(account, inputs, outputs);

    // If no matching swaps, process them like normal transfers
    } else if (swapsIn.length) {
      log.warn(swapsIn, `Can't find matching swaps out`);
      swapsIn.forEach(handleTransfer);
    } else if (swapsOut.length) {
      log.warn(swapsOut, `Can't find matching swaps in`);
      swapsOut.forEach(handleTransfer);
    }

    for (const newEvent of newEvents) {
      newEvent.newBalances = getNetWorth();
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
