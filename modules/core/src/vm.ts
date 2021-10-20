import {
  Account,
  Asset,
  AssetChunk,
  Balances,
  ChunkIndex,
  DecimalString,
  EventErrorCodes,
  Events,
  EventTypes,
  HydratedAssetChunk,
  HydratedEvent,
  OutgoingTransfers,
  StoreKeys,
  Transaction,
  TransferCategories,
  ValueMachine,
  ValueMachineParams,
} from "@valuemachine/types";
import {
  add,
  describeBalance,
  eq,
  getEmptyValueMachine,
  getLogger,
  getValueMachineError,
  gt,
  lt,
  max,
  mul,
  sub,
  sumChunks,
} from "@valuemachine/utils";

const {
  Internal, Income, SwapIn, Borrow, Expense, Fee, SwapOut, Repay, Refund
} = TransferCategories;

export const getValueMachine = (params?: ValueMachineParams): ValueMachine => {
  const { logger, store, json: vmJson } = params || {};

  const log = (logger || getLogger()).child({ module: "ValueMachine" });
  const json = vmJson || store?.load(StoreKeys.ValueMachine) || getEmptyValueMachine();
  const save = (): void => store?.save(StoreKeys.ValueMachine, json);

  const error = getValueMachineError(json);
  if (error) throw new Error(error);

  let tmpChunks = [] as AssetChunk[]; // like flash loans for intra-tx underflows
  let newEvents = [] as Events; // index will be added when we add new events to total
  let txId;

  ////////////////////////////////////////
  // Simple Utils

  const toIndex = (chunk: AssetChunk): ChunkIndex => chunk.index;
  const fromIndex = (chunkIndex: ChunkIndex): AssetChunk | undefined => {
    if (json.chunks[chunkIndex]) {
      return json.chunks[chunkIndex];
    } else {
      log.warn(`No vm chunk exists at index ${chunkIndex}`);
      return undefined;
    }
  };

  const isHeld = (account: Account, asset: Asset) => (chunk: AssetChunk): boolean =>
    chunk.account === account && chunk.asset === asset;

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
    ) ? (chunk.amount ? add(balance, chunk.amount) : "1") : balance,
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
    sumChunks(json.chunks.filter(chunk =>
      chunk.account && (!account || chunk.account === account)
    ));

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
      index: tmp ? tmpChunks.length : json.chunks.length,
      inputs: [],
      history: [{
        date: json.date,
        account,
      }],
    };
    tmp ? tmpChunks.push(newChunk) : json.chunks.push(newChunk);
    return newChunk;
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
      index: tmp ? tmpChunks.length : json.chunks.length,
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

  const borrowChunks = (
    amount: DecimalString,
    asset: Asset,
    account: Account,
  ): AssetChunk[] => {
    log.trace(`Borrowing a chunk of ${amount} ${asset} for ${account}`);
    const loan = mintChunk(amount, asset, account);
    const debt = mintChunk(mul(amount, "-1"), asset, account);
    return [loan, debt];
  };

  const underflow = (amount: DecimalString, asset: Asset, account: Account): AssetChunk => {
    // Fixes apps that provide insufficient info in tx logs to determine interest income eg DSR
    // Disposing of more than we recieved is assumed to represent income rather than a flashloan
    const [_guard, maybeVenu, maybeAddress] = account.split("/");
    const venue = maybeAddress ? maybeVenu : !maybeAddress?.startsWith("0x") ? maybeAddress : "";
    if (venue) {
      log.warn(`Underflow of ${amount} ${asset}, treating it as ${venue} income on ${json.date}`);
      const newChunk = mintChunk(amount, asset, account);
      const newIncomeEvent = newEvents.find(e => e.type === EventTypes.Income);
      if (newIncomeEvent?.type === EventTypes.Income) {
        newIncomeEvent.inputs.push(newChunk.index);
      } else {
        newEvents.push({
          account,
          from: venue,
          date: json.date,
          index: json.events.length + newEvents.length,
          inputs: [newChunk.index],
          txId,
          type: EventTypes.Income,
        });
      }
      return newChunk;
    } else {
      log.warn(`Underflow of ${amount} ${asset}, taking flashloan for ${account} on ${json.date}`);
      mintChunk(mul(amount, "-1"), asset, account, true); // flash debt
      return mintChunk(amount, asset, account); // return borrowed chunk to cover this underflow
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
    if (compare(togo, "0")) {
      log.debug(`${account} has no ${asset} chunks left, we still need ${togo}`);
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
    const flashloans = tmpChunks.filter(chunk =>
      chunk.asset === asset && chunk.account === account
    );
    let togo = amount;
    const repayFlashloan = (debtChunk: AssetChunk) => {
      tmpChunks.splice(tmpChunks.findIndex(c => c.index === debtChunk.index), 1);
    };
    // If account has a flash loan, annihilate incoming value w that first
    if (flashloans.length) {
      log.debug(`Found ${flashloans.length} flash loan chunks for ${account}`);
      flashloans.forEach(debtChunk => {
        if (eq(togo, "0")) return;
        const diff = add(togo, debtChunk.amount);
        if (lt(diff, "0")) {
          // This loan is bigger than what we received, split it up & only annihilate part of it
          const [toAnnihilate, _leftover] = splitChunk(debtChunk, mul(togo, "-1"), true);
          togo = "0";
          repayFlashloan(toAnnihilate);
          log.debug(`Received ${asset} annihilated a total of ${amount} in flashloans`);
        } else {
          // This debt is smaller than what we received, annihilate all of it & move on
          togo = add(togo, debtChunk.amount);
          repayFlashloan(debtChunk);
          log.debug(`Received ${asset} has annihilated flashloans of ${debtChunk.amount} so far`);
        }
      });
    }
    if (gt(togo, "0")) {
      log.debug(`Receiving ${togo} ${asset} in ${account}`);
      return [mintChunk(togo, asset, account)];
    } else {
      return []; // nothing to receive bc we've already used it up
    }
  };

  // Returns the chunks we disposed of
  const disposeValue = (
    amount: DecimalString,
    asset: Asset,
    account: Account,
  ): AssetChunk[] => {
    log.info(`Disposing of ${amount} ${asset} from ${account}`);
    return getChunks(amount, asset, account).map(chunk => {
      chunk.disposeDate = json.date;
      chunk.outputs = [];
      delete chunk.account;
      return chunk;
    });
  };

  const moveValue = (amount: DecimalString, asset: Asset, from: Account, to: Account): void => {
    log.info(`Moving ${amount} ${asset} from ${from} to ${to}`);
    const toMove = getChunks(amount, asset, from);
    toMove.forEach(chunk => {
      chunk.account = to;
      chunk.history.push({ date: json.date, account: to });
    });
    // Handle guard change
    if (to.split("/")[0] !== from.split("/")[0]) {
      newEvents.push({
        chunks: toMove.map(toIndex),
        date: json.date,
        from: from,
        index: json.events.length + newEvents.length,
        insecurePath: [],
        to: to,
        txId,
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
    log.info(`Borrowing ${amount} ${asset} via account ${account}`);
    const loan = borrowChunks(amount, asset, account);
    log.debug(loan, `Borrowed chunks`);
    newEvents.push({
      account,
      date: json.date,
      index: json.events.length + newEvents.length,
      inputs: loan.map(toIndex),
      outputs: [],
      txId,
      type: EventTypes.Debt,
    });
    return loan;
  };

  // returns the annihilated debt + repayment chunks
  const repayValue = (
    amount: DecimalString,
    asset: Asset,
    account: Account,
  ): AssetChunk[] => {
    log.info(`Repaying ${amount} ${asset} via account ${account}`);
    const debt = json.chunks
      .filter(isHeld(account, asset))
      .filter(chunk => lt(chunk.amount, "0"))
      .reduce((acc, cur) => add(acc, cur.amount), "0");
    const remainder = add(amount, debt);
    if (gt(remainder, "0")) {
      log.warn(`Overpaid loan of ${debt} ${asset} on ${json.date}, assuming extra ${
        remainder
      } paid by ${account} is a fee.`);
    }
    // Discard entire repayment along with any extra provided to cover fees
    const toRepayWith = getChunks(amount, asset, account);
    // Don't annihilate any more debt than we have
    const toAnnihilate = getChunks(max(debt, mul(amount, "-1")), asset, account);
    log.debug(toRepayWith, `Using the following chunks to repay ${amount} ${asset}`);
    log.debug(toAnnihilate, `Disposing of the following debt chunks`);
    const disposeChunk = chunk => {
      chunk.disposeDate = json.date;
      chunk.outputs = [];
      delete chunk.account;
    };
    toRepayWith.forEach(disposeChunk);
    toAnnihilate.forEach(disposeChunk);
    const outputs = [...toRepayWith, ...toAnnihilate];
    newEvents.push({
      account,
      date: json.date,
      index: json.events.length + newEvents.length,
      inputs: [],
      outputs: outputs.map(toIndex),
      txId,
      type: EventTypes.Debt,
    });
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
    json.date = tx.date;
    txId = tx.uuid;
    newEvents = [];
    tmpChunks = [];
    log.debug(`Processing transaction #${tx.index} from ${tx.date}: ${txId}`);

    // Create a new copy of transfers that we can modify in-place
    const transfers = JSON.parse(JSON.stringify(tx.transfers));

    // Subtract refunds from associated outgoing transfers
    const refunds = transfers.filter(transfer => transfer.category === Refund);
    if (refunds.length) {
      refunds.forEach(refund => {
        const refunded = transfers.find(transfer =>
          transfer.amount &&
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

    // Process all non-swap & non-refund transfers
    const swapAccounts = new Set<Account>();
    const swapsOut = [] as AssetChunk[];
    const swapsIn = [] as AssetChunk[];
    transfers.forEach(transfer => {
      const { asset, category, from, to } = transfer;
      const amount = !transfer.amount ? "1" // treat NFTs as always having amount=1
        : transfer.amount === "ALL" ? getBalance(asset, from)
        : transfer.amount;

      if (eq(amount, "0")) return;

      if (category === Internal) {
        moveValue(amount, asset, from, to);

      // Fees should be handled w/out emitting an event
      } else if (category === Fee) {
        disposeValue(amount, asset, from);

      // Debt
      } else if (category === Borrow) {
        borrowValue(amount, asset, from);
        moveValue(amount, asset, from, to);
      } else if (category === Repay) {
        moveValue(amount, asset, from, to);
        repayValue(amount, asset, to);

      // Trades
      } else if (category === SwapOut) {
        swapAccounts.add(from);
        swapsOut.push(...disposeValue(amount, asset, from));
      } else if (category === SwapIn) {
        swapAccounts.add(to);
        swapsIn.push(...receiveValue(amount, asset, to));

      // Send funds out of our accounts
      } else if (category === Expense) {
        const disposed = disposeValue(amount, asset, from);
        // log.debug(disposed, `disposed of the following chunks`);
        newEvents.push({
          account: from,
          to,
          date: json.date,
          index: json.events.length + newEvents.length,
          outputs: disposed.map(toIndex),
          txId,
          type: EventTypes.Expense,
        });

      // Receive funds into one of our accounts
      } else if (category === Income) {
        const received = receiveValue(amount, asset, to);
        // log.debug(received, `received the following chunks`);
        newEvents.push({
          account: to,
          from,
          date: json.date,
          index: json.events.length + newEvents.length,
          inputs: received.map(toIndex),
          txId,
          type: EventTypes.Income,
        });

      } else {
        log.debug(`Skipping transfer of type ${category}`);
      }
    });

    // If we have mismatched swap transfers, emit errors
    if (swapsIn.length && !swapsOut.length) {
      const message = `Swap in of ${describeBalance(sumChunks(swapsIn))} has no matching outputs`;
      log.error(message);
      newEvents.push({
        accounts: swapsIn.map(swap => swap.account).filter(s => !!s),
        code: EventErrorCodes.MISSING_SWAP,
        date: json.date,
        index: json.events.length + newEvents.length,
        message,
        txId,
        type: EventTypes.Error,
      });

    } else if (swapsOut.length && !swapsIn.length) {
      const message = `Swap out of ${describeBalance(sumChunks(swapsOut))} has no matching inputs`;
      log.error(message);
      newEvents.push({
        accounts: swapsOut.map(s => s.history[s.history.length - 2]?.account).filter(s => !!s),
        code: EventErrorCodes.MISSING_SWAP,
        date: json.date,
        index: json.events.length + newEvents.length,
        message,
        txId,
        type: EventTypes.Error,
      });

    } else if (swapsIn.length && swapsOut.length) {
      // Set indicies of trade input & output chunks
      swapsOut.forEach(chunk => { chunk.outputs = swapsIn.map(toIndex); });
      swapsIn.forEach(chunk => { chunk.inputs = swapsOut.map(toIndex); });
      // Emit error if the swap accounts don't all match
      if (swapAccounts.size > 1) {
        const message = `Trade involved ${swapAccounts.size} accounts`;
        log.error(message);
        newEvents.push({
          accounts: Array.from(swapAccounts),
          code: EventErrorCodes.MULTI_ACCOUNT_SWAP,
          date: json.date,
          index: json.events.length + newEvents.length,
          message,
          txId,
          type: EventTypes.Error,
        });
      }
      // emit trade event
      newEvents.push({
        account: swapsIn[0].history[0].account,
        date: json.date,
        index: json.events.length + newEvents.length,
        inputs: swapsIn.map(toIndex),
        outputs: swapsOut.map(toIndex),
        txId,
        type: EventTypes.Trade,
      });
    }

    // Interpret any leftover tmp chunks as loans
    while (tmpChunks.length) {
      const flashloan = tmpChunks.shift();
      flashloan.index = json.chunks.length;
      json.chunks.push(flashloan);
      const { account, amount, asset } = flashloan;
      newEvents.push({
        account,
        date: json.date,
        index: json.events.length + newEvents.length,
        inputs: [flashloan.index], // where's it's sibling?!
        outputs: [],
        txId,
        type: EventTypes.Debt,
      });
      const message = `${account} had an underflow of ${amount} ${asset}`;
      log.error(message);
      newEvents.push({
        accounts: [account],
        code: EventErrorCodes.UNDERFLOW,
        date: json.date,
        index: json.events.length + newEvents.length,
        message,
        txId,
        type: EventTypes.Error,
      });
    }

    // Finalize new events
    while (newEvents.length) {
      json.events.push(newEvents.shift());
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
