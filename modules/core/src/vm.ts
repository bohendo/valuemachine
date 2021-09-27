import {
  EvmApps,
} from "@valuemachine/transactions";
import {
  Account,
  Asset,
  AssetChunk,
  Balances,
  ChunkIndex,
  DebtEvent,
  DecimalString,
  EventErrorCodes,
  Events,
  EventTypes,
  HydratedAssetChunk,
  HydratedEvent,
  OutgoingTransfers,
  StoreKeys,
  TradeEvent,
  Transaction,
  TransferCategories,
  ValueMachine,
  ValueMachineParams,
} from "@valuemachine/types";
import {
  abs,
  add,
  dedup,
  describeBalance,
  diffBalances,
  eq,
  getEmptyValueMachine,
  getLogger,
  getValueMachineError,
  gt,
  lt,
  mul,
  sub,
  sumChunks,
  sumTransfers,
} from "@valuemachine/utils";

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

  // similar to flash loans for intra-tx underflows arising from out of order transfers
  let tmpChunks = [] as AssetChunk[];

  ////////////////////////////////////////
  // Simple Utils

  const toIndex = (chunk: AssetChunk): ChunkIndex => chunk.index;
  const fromIndex = (chunkIndex: ChunkIndex): AssetChunk | undefined => {
    if (json.chunks[chunkIndex]) {
      return json.chunks[chunkIndex];
    } else {
      log.warn(`No valid chunk exists at index ${chunkIndex}: ${
        JSON.stringify(json.chunks[chunkIndex], null, 2)
      }`);
      return undefined;
    }
  };

  const isHeld = (account: Account, asset: Asset) => (chunk: AssetChunk): boolean =>
    chunk.account === account && chunk.asset === asset;

  const wasHeld = (account: Account, asset: Asset) => (chunk: AssetChunk): boolean =>
    chunk.asset === asset && chunk.history.some(hist => hist.account === account);

  const getFirstOwner = (chunk: AssetChunk): Account => chunk.history[0].account;

  ////////////////////////////////////////
  // Getters

  const getAccounts = (): Account[] => Array.from(json.chunks.reduce((accounts, chunk) => {
    chunk.history.forEach(entry => { accounts.add(entry.account); });
    return accounts;
  }, new Set<string>())).sort();

  const getBalance = (asset: Asset, account?: Account): DecimalString =>
    json.chunks.reduce((balance, chunk) => (
      (asset && chunk.asset === asset) && ((
        !account && chunk.account
      ) || (
        account && chunk.account === account
      ))
    ) ? add(balance, chunk.amount) : balance,
    "0");

  const getChunk = (index: number): HydratedAssetChunk =>
    JSON.parse(JSON.stringify({
      ...json.chunks[index],
      inputs: json.chunks[index]?.inputs?.map(fromIndex).filter(c => !!c) || [],
      outputs: json.chunks[index]?.outputs?.map(fromIndex).filter(c => !!c) || undefined,
    }));

  const getEvent = (index: number): HydratedEvent => {
    const target = json.events[index] as any;
    if (!target) throw new Error(`No event exists at index ${index}`);
    return JSON.parse(JSON.stringify({
      ...target,
      chunks: target?.chunks?.map(fromIndex).filter(c => !!c) || undefined,
      inputs: target?.inputs?.map(fromIndex).filter(c => !!c) || undefined,
      outputs: target?.outputs?.map(fromIndex).filter(c => !!c) || undefined,
    }));
  };

  const getNetWorth = (account?: Account): Balances =>
    json.chunks.reduce((netWorth, chunk) => {
      if (chunk.account && (!account || chunk.account === account)) {
        netWorth[chunk.asset] = add(netWorth[chunk.asset], chunk.amount);
      }
      return netWorth;
    }, {});

  ////////////////////////////////////////
  // Chunk Manipulators

  const mintChunk = (
    amount: DecimalString,
    asset: Asset,
    account: Account,
    tmp?: boolean,
  ): AssetChunk => {
    log.trace(`Minting a ${tmp ? "tmp" : "new"} chunk of ${amount} ${asset} for ${account}`);
    const newChunk = {
      amount,
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
    amount: DecimalString,
    asset: Asset,
    account: Account,
    tmp?: boolean,
  ): AssetChunk[] => {
    log.trace(`Borrowing a ${tmp ? "tmp " : ""}chunk of ${amount} ${asset} for ${account}`);
    const loan = mintChunk(amount, asset, account, tmp);
    const debt = mintChunk(mul(amount, "-1"), asset, account, tmp);
    return [loan, debt];
  };

  const splitChunk = (
    oldChunk: AssetChunk,
    amtNeeded: DecimalString,
    tmp?: boolean,
  ): AssetChunk[] => {
    const { asset, amount: total } = oldChunk;
    const leftover = sub(total, amtNeeded);
    log.trace(`Splitting a chunk of ${total} ${asset} into ${amtNeeded} and ${leftover}`);
    // Ensure this new chunk has a completely separate memory allocation
    const newChunk = JSON.parse(JSON.stringify({
      ...oldChunk,
      amount: amtNeeded,
      index: json.chunks.length + tmpChunks.length,
    }));
    tmp ? tmpChunks.push(newChunk) : json.chunks.push(newChunk);
    oldChunk.amount = leftover;
    if ("index" in oldChunk) {
      // Add the new chunk's index alongside the old one anywhere it was referenced
      [...json.events, ...newEvents].forEach((event: any) => {
        if (event.inputs?.includes(oldChunk.index)) { event.inputs.push(newChunk.index); }
        if (event.outputs?.includes(oldChunk.index)) { event.outputs.push(newChunk.index); }
        if (event.chunks?.includes(oldChunk.index)) { event.chunks.push(newChunk.index); }
      });
      [...json.chunks, ...tmpChunks].forEach(chunk => {
        if (chunk.inputs?.includes(oldChunk.index)) { chunk.inputs.push(newChunk.index); }
        if (chunk.outputs?.includes(oldChunk.index)) { chunk.outputs.push(newChunk.index); }
      });
    }
    return [newChunk, oldChunk];
  };

  const underflow = (amount: DecimalString, asset: Asset, account: Account): AssetChunk => {
    if (isIncomeSource(account)) {
      log.warn(`Underflow of ${amount} ${asset} is being treated as income`);
      const newChunk = mintChunk(amount, asset, account);
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
      log.warn(`Underflow of ${amount} ${asset} is being treated as a flashloan by ${account}`);
      const loan = mintChunk(amount, asset, account, true);
      return loan;
    }
  };

  const getChunks = (
    amount: DecimalString,
    asset: Asset,
    account: Account,
  ): AssetChunk[] => {
    const compare = lt(amount, "0") ? lt : gt;
    // If we're getting a positive amount, get all held chunks w amount > 0 else vice versa
    const available = json.chunks
      .filter(isHeld(account, asset))
      .filter(chunk => compare(chunk.amount, "0"));
    const output = [];
    let togo = amount;
    for (const chunk of available) {
      if (eq(togo, "0")) {
        return output;
      } else if (compare(chunk.amount, togo)) { // if we got more than we need, split it up
        const [needed, _leftover] = splitChunk(chunk, togo);
        return [...output, needed];
      }
      output.push(chunk); // if we got less than we need, move on to the next chunk
      togo = sub(togo, chunk.amount);
    }
    if (gt(togo, "0")) {
      log.warn(`${account} has no ${asset} chunks left, we still need ${togo}`);
      output.push(underflow(togo, asset, account));
    }
    return output;
  };

  ////////////////////////////////////////
  // Value Manipulators

  // Returns the newly received chunks
  const receiveValue = (
    amount: DecimalString,
    asset: Asset,
    account: Account,
  ): AssetChunk[] => {
    log.info(`Receiving ${amount} ${asset} in ${account}`);
    const tmpAvailable = tmpChunks.filter(wasHeld(account, asset));
    let togo = amount;
    const received = [];
    // If account has any tmp chunks, use those first (& discard any associated debt)
    if (tmpAvailable.length) {
      log.debug(`Found ${tmpAvailable.length} chunks for ${account} out of the tmp set (${tmpChunks.length} remaining)`);
      tmpAvailable.forEach(chunk => {
        if (eq(togo, "0")) return;
        if (gt(chunk.amount, togo)) {
          // This chunk is too big, split it up & only receive part of it
          const [toReceive, leftover] = splitChunk(chunk, togo, true);
          received.push(toReceive);
          togo = sub(togo, toReceive.amount);
          log.debug(`Received ${toReceive.amount} ${
            toReceive.asset
          } from a tmp chunk leaving ${leftover.amount} behind (${togo} to go)`);
        } else {
          // This chunk is too small, receive all of it & move on
          received.push(chunk);
          togo = sub(togo, chunk.amount);
          log.debug(`Received a tmp chunk of ${chunk.amount} (${togo} to go)`);
        }
      });
    }
    // move received chunks from tmp to the master list
    received.forEach(chunk => {
      log.debug(`Moving tmp chunk of ${chunk.amount} ${chunk.asset} to the master list of chunks`);
      json.chunks.push(chunk);
      tmpChunks.splice(tmpChunks.findIndex(tmpChunk => tmpChunk.index === chunk.index), 1);
    });
    json.chunks.sort((c1, c2) => c1.index - c2.index);
    if (gt(togo, "0")) {
      return [...received, mintChunk(togo, asset, account)];
    } else {
      return received;
    }
  };

  // Returns the chunks we disposed of
  const disposeValue = (
    amount: DecimalString,
    asset: Asset,
    account: Account,
  ): AssetChunk[] => {
    log.info(`Disposing of ${amount} ${asset} from ${account}`);
    const disposeChunk = chunk => {
      chunk.disposeDate = json.date;
      chunk.outputs = [];
      delete chunk.account;
    };
    const balance = getBalance(asset, account);
    const available = json.chunks.filter(isHeld(account, asset));
    if (eq(balance, amount)) {
      available.forEach(disposeChunk);
      log.debug(`Disposed full balance of ${
        available.map(c => c.amount).join(" + ")
      } ${asset} from ${account}`);
      return available;
    } else if (gt(balance, amount)) {
      const toDispose = getChunks(amount, asset, account);
      toDispose.forEach(disposeChunk);
      log.debug(`Disposed of ${
        toDispose.map(c => c.amount).join(" + ")
      } ${asset} from ${account}`);
      return toDispose;
    } else if (lt(balance, amount)) {
      available.forEach(disposeChunk);
      const togo = sub(amount, balance);
      const rest = underflow(togo, asset, account);
      disposeChunk(rest);
      log.debug(`Disposed of all ${asset} from ${account} and underflowed by ${rest.amount}`);
      return [...available, rest];
    }
    log.warn(`Wtf how is ${balance} not > or < or = to ${amount}???`);
    return [];
  };

  const tradeValue = (account: Account, swapsIn: Balances, swapsOut: Balances): void => {
    log.info(`Trading ${JSON.stringify(swapsOut)} for ${JSON.stringify(swapsIn)}`);
    const chunksOut = [] as AssetChunk[];
    for (const swapOut of Object.entries(swapsOut)) {
      const asset = swapOut[0] as Asset;
      const amount = swapOut[1] as DecimalString;
      chunksOut.push(...disposeValue(amount, asset, account));
    }
    const chunksIn = [] as AssetChunk[];
    for (const swapIn of Object.entries(swapsIn)) {
      const asset = swapIn[0] as Asset;
      const amount = swapIn[1] as DecimalString;
      chunksIn.push(...receiveValue(amount, asset, account));
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

  const moveValue = (amount: DecimalString, asset: Asset, from: Account, to: Account): void => {
    log.info(`Moving ${amount} ${asset} from ${from} to ${to}`);
    const toMove = getChunks(amount, asset, from);
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
    amount: DecimalString,
    asset: Asset,
    account: Account,
  ): AssetChunk[] => {
    log.debug(`Borrowing ${amount} ${asset} via account ${account}`);
    const loan = borrowChunks(amount, asset, account);
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
    amount: DecimalString,
    asset: Asset,
    account: Account,
  ): AssetChunk[] => {
    log.info(`Repaying ${amount} ${asset} via account ${account}`);
    log.info(getNetWorth(account), `Account balance for ${account}`);
    const held = json.chunks.filter(isHeld(account, asset));
    const positiveChunks = held.filter(chunk => gt(chunk.amount, "0"));
    const negativeChunks = held.filter(chunk => lt(chunk.amount, "0"));
    const positiveBalance = positiveChunks.reduce((acc, cur) => add(acc, cur.amount), "0");
    const negativeBalance = negativeChunks.reduce((acc, cur) => add(acc, cur.amount), "0");
    if (lt(positiveBalance, amount)) {
      log.warn(`Account ${account} has insufficent funds for repayment of ${amount} ${asset}`);
    }
    if (lt(abs(negativeBalance), amount)) {
      log.warn(`Account ${account} has insufficent debt for repayment of ${amount} ${asset}`);
    }
    const toRepayWith = getChunks(amount, asset, account);
    const toAnnihilate = getChunks(mul(amount, "-1"), asset, account);
    log.info(toRepayWith, `Using the following chunks to repay ${amount} ${asset}`);
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
    if (new Date(tx.date).getTime() < new Date(json.date).getTime()) {
      throw new Error(`Fatal: Out of order transactions. Expected this tx from ${
        tx.date
      } to come after ${json.date}`);
    }
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
          lt(refund.amount, transfer.amount)
        );
        if (refunded) {
          log.info(`Subtracting refund of ${refund.amount} ${
            refund.asset
          } from ${refunded.category} of ${refunded.amount} ${refunded.asset}`);
          refunded.amount = sub(refunded.amount, refund.amount);
        } else {
          log.warn(`Can't find matching transfer for refund of ${
            refund.amount
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
      const message = `Swap in of ${
        describeBalance(sumChunks(swapsIn))
      } has no matching swaps out`;
      log.error(message);
      newEvents.push({
        account: swapsIn[0].to,
        code: EventErrorCodes.MISSING_SWAP,
        date: json.date,
        index: json.events.length + newEvents.length,
        message,
        txId: tx.uuid,
        type: EventTypes.Error,
      });
    } else if (swapsOut.length && !swapsIn.length) {
      swapsOut.forEach(swap => { swap.category = Expense; });
      const message = `Swap out of ${
        describeBalance(sumChunks(swapsOut))
      } has no matching swaps in`;
      log.error(message);
      newEvents.push({
        account: swapsOut[0].from,
        code: EventErrorCodes.MISSING_SWAP,
        date: json.date,
        index: json.events.length + newEvents.length,
        message,
        txId: tx.uuid,
        type: EventTypes.Error,
      });
    // If we have matching swap transfers, process the trade first
    } else if (swapsOut.length && swapsIn.length) {
      const account = swapsOut[0].from || swapsIn[0].to;
      // Sum transfers & subtract duplicates to get total values traded
      const [inputs, outputs] = diffBalances([sumTransfers(swapsIn), sumTransfers(swapsOut)]);
      tradeValue(account, inputs, outputs);
      if (
        // All self accounts should be the same in all swap transfers
        !swapsIn.every(swap => swap.to === account) ||
        !swapsOut.every(swap => swap.from === account)
      ) {
        // TODO: how do we handle when to/from values aren't consistent among swap transfers?
        // eg add a synthetic internal transfer to ensure the trade only involve one account?
        const message = `Assets moved accounts mid-trade, assuming the account was ${account}`;
        log.error(message);
        newEvents.push({
          account,
          code: EventErrorCodes.MULTI_ACCOUNT_SWAP,
          date: json.date,
          index: json.events.length + newEvents.length,
          message,
          txId: tx.uuid,
          type: EventTypes.Error,
        });
      }
    }

    // Process all non-swap & non-refund transfers
    transfers.forEach(transfer => {
      const { asset, category, from, amount, to } = transfer;
      if (category === Borrow) {
        borrowValue(amount, asset, from);
        moveValue(amount, asset, from, to);
      } else if (category === Repay) {
        moveValue(amount, asset, from, to);
        repayValue(amount, asset, to);
      } else if (category === Internal) {
        moveValue(amount, asset, from, to);
      } else if (category === Fee) {
        // Fees should be handled w/out emitting an event
        disposeValue(amount, asset, from);
      // Send funds out of our accounts
      } else if (category === Expense) {
        const disposed = disposeValue(amount, asset, from);
        // log.debug(disposed, `disposed of the following chunks`);
        newEvents.push({
          account: from,
          index: json.events.length + newEvents.length,
          date: json.date,
          outputs: disposed.map(toIndex),
          type: EventTypes.Expense,
        });
      // Receive funds into one of our accounts
      } else if (category === Income) {
        const received = receiveValue(amount, asset, to);
        // log.debug(received, `received the following chunks`);
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

    // Interpret any leftover tmp chunks as loans (& coalesce loans of the same asset type)
    json.chunks.sort((c1, c2) => c1.index - c2.index);
    for (const asset of dedup(tmpChunks.map(chunk => chunk.asset))) {
      for (const account of dedup(tmpChunks.map(getFirstOwner))) {
        const chunks = tmpChunks.filter(chunk =>
          chunk.asset === asset && getFirstOwner(chunk) === account
        );
        const total = sumChunks(chunks)[asset] || "0";
        if (gt(total, "0")) {
          const debt = mintChunk(mul(total, "-1"), asset, account);
          newEvents.push({
            date: json.date,
            index: json.events.length + newEvents.length,
            type: EventTypes.Debt,
            inputs: [...chunks.map(toIndex), debt.index],
            outputs: [],
            account,
          } as DebtEvent);
          const message = `${account} disposed of assets it didn't have: ${total} ${asset}`;
          log.error(message);
          newEvents.push({
            account,
            code: EventErrorCodes.UNDERFLOW,
            date: json.date,
            index: json.events.length + newEvents.length,
            message,
            txId: tx.uuid,
            type: EventTypes.Error,
          });
        }
      }
    }

    // move leftover chunks from tmp to the master list
    tmpChunks.forEach(chunk => {
      log.warn(chunk, `Moving chunk ${chunk.index} from tmp to master list`);
      json.chunks.push(chunk);
    });
    json.chunks.sort((c1, c2) => c1.index - c2.index);

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
