import {
  Account,
  Transfer,
  TransferCategories,
  SecurityProvider,
  AddressBook,
  AssetChunk,
  Assets,
  DecimalString,
  emptyState,
  Events,
  EventTypes,
  Logger,
  Balances,
  StateFns,
  PhysicalGuardians,
  StateJson,
  TimestampString,
  TransferCategory,
  TransactionSources,
} from "@finances/types";
import { getLogger, math } from "@finances/utils";

// const {
//   Internal, Deposit, Withdraw, Income, SwapIn, Borrow, Expense, SwapOut, Repay,
// } = TransferCategories;
const { add, eq, gt, lt, mul, round, sub } = math;

// Apps that provide insufficient info in tx logs to determine interest income
// Hacky fix: withdrawing more than we deposited is assumed to represent interest rather than debt
const isOpaqueInterestBearers = (account: Account): boolean =>
  account.startsWith(`${TransactionSources.Maker}-DSR`);

export const getStateFns = ({
  addressBook,
  date,
  events,
  logger,
  stateJson,
}: {
  addressBook: AddressBook;
  date: TimestampString;
  events: Events;
  logger?: Logger;
  stateJson?: StateJson;
}): StateFns => {
  const state = stateJson || JSON.parse(JSON.stringify(emptyState));
  const chunks = state.chunks; // just for convenience
  const log = (logger || getLogger()).child({ module: "State" });

  state.date = date;

  ////////////////////////////////////////
  // Event Handlers

  ////////////////////////////////////////
  // Internal Functions

  const getJson = () => state;

  const isPhysicallyGuarded = (account) => 
    Object.keys(PhysicalGuardians).includes(addressBook.getGuardian(account));

  const isHeld = (account: Account, asset: Assets) => (chunk: AssetChunk): boolean =>
    chunk.account === account && chunk.asset === asset;

  const mintChunk = (
    quantity: DecimalString,
    asset: Assets,
    account: Account,
  ): AssetChunk => {
    const newChunk = {
      quantity,
      asset,
      account,
      index: chunks.length,
      inputs: [],
      receiveDate: date,
      unsecured: isPhysicallyGuarded(account) ? "0" : quantity,
    };
    chunks.push(newChunk);
    return newChunk;
  };

  const borrowChunk = (quantity: DecimalString, asset: Assets, account: Account): AssetChunk[] => {
    const loan = mintChunk(quantity, asset, account);
    const debt = mintChunk(mul(quantity, "-1"), asset, account);
    return [loan, debt];
  };

  const underflow = (quantity: DecimalString, asset: Assets, account: Account): AssetChunk[] => {
    if (isOpaqueInterestBearers(account)) {
      log.debug(`Underflow of ${quantity} ${asset} is being handled as opaque interest`);
      // Emit a synthetic income event
      return [mintChunk(quantity, asset, account)];
    } else {
      log.debug(`Underflow of ${quantity} ${asset} is being handled by taking out a loan`);
      const [loan, _debt] = borrowChunk(quantity, asset, account);
      return [loan];
    }
  };

  const splitChunk = (
    oldChunk: AssetChunk,
    amtNeeded: DecimalString,
  ): AssetChunk[] => {
    const { asset, quantity: total } = oldChunk;
    const leftover = sub(total, amtNeeded);
    const newChunk = { ...oldChunk, quantity: amtNeeded, index: chunks.length };
    chunks.push(newChunk); // not minting bc we want to keep receiveDate the same
    oldChunk.quantity = leftover;
    log.debug(`Split ${asset} chunk of ${total} into ${amtNeeded} and ${leftover}`);
    return [newChunk, oldChunk];
  };

  const getChunks = (
    quantity: DecimalString,
    asset: Assets,
    account: Account,
  ): AssetChunk[] => {
    const balance = getBalance(account, asset);
    const available = chunks.filter(isHeld(account, asset));

    // If balance equals what we need, return all available chunks
    if (eq(balance, quantity)) {
      log.warn(`Got all chunks from ${account} for a total of ${quantity} ${asset}`);
      return available;
    }

    const inDebt = lt(balance, "0");
    const needDebt = lt(quantity, "0");

    // Positive balance and we need a positive amount: proceed as usual
    if (!inDebt && !needDebt) {
      // If we don't have enough, give everything we have & underflow
      if (lt(balance, quantity)) {
        const remainder = underflow(quantity, asset, account);
        return available.concat([remainder]);
      // If we have more chunks than needed, return some of them
      } else {
        const output = [];
        let togo = quantity;
        for (const chunk of available) {
          if (eq(togo, "0")) {
            return output;
          } else if (gt(chunk.quantity, togo)) {
            const [needed, _leftover] = splitChunk(chunk, togo);
            return output.concat([needed]);
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
            return output.concat([needed]);
          }
          output.push(chunk);
          togo = sub(togo, chunk.quantity);
        }
        log.error(`No debt left, we still have ${togo} ${asset} to go!`);
        return output;
      // If we have less debt than needed, borrow to make up the difference
      } else {
        const [_loan, debt] = borrowChunk(quantity, asset, account);
        log.warn(`Got all ${asset} debt from ${account} and borrowed ${debt} more`);
        return available.concat([debt]);
      }

    // If we're not in debt and want to get a negative quantity, we need some fresh debt
    } else if (!inDebt && needDebt) {
      const [loan, debt] = borrowChunk(quantity, asset, account);
      log.warn(`Borrowed ${loan.quantity} ${loan.asset} bc we needed debt & didn't have any`);
      return [debt];
    // If we're in debt and want to get a positive quantity, we need to go into more debt
    } else if (inDebt && !needDebt) {
      const [loan, _debt] = borrowChunk(quantity, asset, account);
      log.warn(`Borrowed ${loan.quantity} ${loan.asset} bc we're already had ${balance} of debt`);
      return [loan];
    }
    log.warn(`How did we get here?!`);
    return [];
  };

  ////////////////////////////////////////
  // Exported Methods

  const getBalance = (account: Account, asset: Assets): DecimalString =>
    chunks.reduce((balance, chunk) => {
      return isHeld(account, asset)(chunk) ? add(balance, chunk.quantity) : balance;
    }, "0");

  const getAccounts = (): Account[] => Array.from(
    new Set(...chunks.map(chunk => chunk.account).filter(chunk => !!chunk))
  );

  const getNetWorth = (account?: Account): Balances =>
    chunks.reduce((netWorth, chunk) => {
      if (chunk.account && (!account || chunk.account === account)) {
        netWorth[chunk.asset] = add(netWorth[chunk.asset], chunk.quantity);
      }
      return netWorth;
    }, {});

  // Returns the newly minted chunks and/or the annihilated debt chunks
  const receiveValue = (
    quantity: DecimalString,
    asset: Assets,
    account: Account,
  ): AssetChunk[] => {
    const balance = getBalance(account, asset);
    // If account balance is positive, add a new chunk
    if (!lt(balance, "0")) {
      log.debug(`Received new chunk of ${quantity} ${asset} for ${account}`);
      return [mintChunk(quantity, asset, account)];
    } else {
      // If account balance is negative, annihilate debt before maybe adding new chunks
      const disposeDebt = chunk => {
        chunk.disposeDate = date;
        chunk.outputs = [];
        delete chunk.account;
      };
      const debt = mul(balance, "-1");
      const available = chunks.filter(isHeld(account, asset));
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
    asset: Assets,
    account: Account,
  ): AssetChunk[] => {
    const disposeChunk = chunk => {
      chunk.disposeDate = date;
      chunk.outputs = [];
      delete chunk.account;
    };
    const balance = getBalance(account, asset);
    // If balance is negative, borrow a chunk & dispose of it
    if (lt(balance, "0")) {
      const [loan, _debt] = borrowChunk(quantity, asset, account);
      log.debug(`Borrowing & disposing ${quantity} ${asset} from ${account}`);
      disposeChunk(loan);
      return [loan];
    } 
    // If balance is positive, dispose positive chunks before maybe taking any more loans
    const available = chunks.filter(isHeld(account, asset));
    if (eq(balance, quantity)) {
      available.forEach(disposeChunk);
      log.debug(`Disposed full balance of ${quantity} ${asset} from ${account}`);
      return available;
    } else if (gt(balance, quantity)) {
      const toDispose = getChunks(quantity, asset, account)
      toDispose.forEach(disposeChunk);
      log.debug(`Disposed of ${quantity} ${asset} from ${account}`);
      return toDispose;
    } else if (lt(balance, quantity)) {
      available.forEach(disposeChunk);
      const togo = sub(quantity, balance);
      const [loan, _debt] = borrowChunk(togo, asset, account);
      disposeChunk(loan);
      log.debug(`Disposed of all ${asset} from ${account} and borrowed/disposed of ${loan} more`);
      return [...available, loan];
    }
    log.warn(`How did we get here?!`);
    return [];
  };

  const moveValue = (quantity: DecimalString, asset: Assets, from: Account, to: Account): void => {
    const toMove = getChunks(quantity, asset, from);
    toMove.forEach(chunk => { chunk.account = to; });
    if (isPhysicallyGuarded(to) && !isPhysicallyGuarded(from)) {
      // Handle jurisdiction change
      const oldGuard = addressBook.getGuardian(from);
      const newGuard = addressBook.getGuardian(to);
      const securedChunks = [];
      toMove.forEach(chunk => {
        const securedSources = state.secureChunk(chunk);
        securedChunks.push(...securedSources);
        log.warn(securedSources, `We secured ${
          securedSources.length
        } sources of chunk ${chunk.index}`);
      });
      if (securedChunks.length) {
        log.warn(`We secured a total of ${securedChunks.length} chunks`);
      }
      events.push({
        asset: asset,
        quantity: quantity,
        date,
        description: `${round(quantity)} ${
          asset
        } moved jurisdictions from ${oldGuard} to ${newGuard}`,
        from: from,
        to: to,
        movedChunks: toMove,
        securedChunks,
        newBalances: {
          [to]: { [asset]: getBalance(to, asset) },
          [from]: { [asset]: getBalance(from, asset) },
        },
        newJurisdiction: newGuard,
        oldJurisdiction: oldGuard,
        tags: [],
        type: EventTypes.JurisdictionChange,
      });
    }
  };

  const tradeValue = (account: Account, swapsIn: Balances, swapsOut: Balances): void => {
    const chunksOut = [] as AssetChunk[];
    for (const swapOut of Object.entries(swapsOut)) {
      const asset = swapOut[0] as Assets;
      const quantity = swapOut[1] as DecimalString;
      chunksOut.push(...disposeValue(quantity, asset, account));
    }
    const chunksIn = [] as AssetChunk[];
    for (const swapIn of Object.entries(swapsIn)) {
      const asset = swapIn[0] as Assets;
      const quantity = swapIn[1] as DecimalString;
      chunksIn.push(...receiveValue(quantity, asset, account));
    }
    // Set indicies of trade input & output chunks
    chunksOut.forEach(chunk => { chunk.outputs = chunksIn.map(chunk => chunk.index); });
    chunksIn.forEach(chunk => { chunk.inputs = chunksIn.map(chunk => chunk.index); });
  };

  /*
  const chunks = state.getChunks(account, asset, quantity, date, events);
  chunksOut.push(...chunks);
  if (isPhysicallyGuarded(account)) {
    chunks.forEach(chunk => { chunk.unsecured = "0"; });
  } else {
    chunks.forEach(chunk => { chunk.disposeDate = date; });
  }
  chunks.forEach(chunk => state.disposeChunk(chunk));
  tradeEvent.spentChunks = [...chunks]; // Assumes chunks are never modified.. Is this safe?
  */

  /*
  // Given a chunk and one of that chunk's sources, return a value between 0 and 1
  // Returned value represents the proportion of the source that went into the chunk
  const getProportion = (chunk, source): DecimalString => {
    // Search through all chunks & find ones that 
    const allChunks 
  };
  */

  /*
  const secureChunk = (
    chunk: AssetChunk,
  ): AssetChunk[] => {
    // Recursively loops through a chunks sources
    const output = [];
    const secureSources = (hunk: AssetChunk): AssetChunk[] => {
      const { index, quantity, asset, sources } = hunk;
      log.debug(`Tracing path of chunk #${index} of ${quantity} ${asset} from ${sources}`);
      output.push(hunk);
      for (const srcIndex of sources) {
        const src = state.history.find(hunk => hunk.index === srcIndex);
        if (src && src) {
          output.concat(...secureSources(src));
        }
      }
      return output;
    };
    const { index, asset, quantity, sources } = chunk;
    log.debug(`Getting insecure path of chunk #${index} of ${quantity} ${asset} from ${sources}`);
    if (!sources) {
      return [chunk];
    } else {
      return secureSources(chunk);
    }
  };
  */

  return {
    receiveValue,
    moveValue,
    tradeValue,
    disposeValue,
    getJson,
    getAccounts,
    getBalance,
    getNetWorth,
  };
};
