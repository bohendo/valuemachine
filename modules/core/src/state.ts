import {
  Account,
  AddressBook,
  AssetChunk,
  Assets,
  DecimalString,
  emptyState,
  Events,
  EventTypes,
  Logger,
  NetWorth,
  StateFns,
  PhysicalGuardians,
  StateJson,
  TimestampString,
  TransactionSources,
} from "@finances/types";
import { getLogger, math } from "@finances/utils";

const { add, eq, gt, lt, mul, sub } = math;

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
  // Internal Functions

  const isPhysicallyGuarded = (account) => 
    Object.keys(PhysicalGuardians).includes(addressBook.getGuardian(account));

  const isHeld = (account: Account, asset: Assets) => (chunk: AssetChunk): boolean =>
    chunk.account === account && account.asset === asset;

  const mintChunk = (
    quantity: DecimalString,
    asset: Assets,
    account: Account,
    inputs?: number[],
  ): AssetChunk => {
    const newChunk = {
      quantity,
      asset,
      account,
      inputs: inputs || [],
      receiveDate: date,
      unsecured: isPhysicallyGuarded(account) ? "0" : quantity,
    };
    chunks.push(newChunk);
    return newChunk;
  };

  const splitChunk = (
    oldChunk: AssetChunk,
    amtNeeded: DecimalString,
  ): AssetChunk[] => {
    const { asset, quantity: total } = oldChunk;
    const leftover = sub(total, amtNeeded);
    const newChunk = { ...oldChunk, quantity: amtNeeded };
    chunks.push(newChunk);
    oldChunk.quantity = leftover;
    log.debug(`Split ${asset} chunk of ${total} into ${amtNeeded} and ${leftover}`);
    return [newChunk, oldChunk];
  };

  const borrowChunk = (quantity: DecimalString, asset: Assets, account: Account): AssetChunk[] => {
    const loan = mintChunk(quantity, asset, account); // debt has no sources
    const debt = mintChunk(mul(quantity, "-1"), asset, account); // debt has no sources
    return [loan, debt];
  };

  // What if quantity & balance are both negative?
  const getChunks = (
    quantity: DecimalString, // maybe negative if we're looking for debt
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
      // If we don't have enough, give everything we have & borrow the rest
      if (lt(balance, quantity)) {
        const [loan, _debt] = borrowChunk(quantity, asset, account);
        log.debug(`Got all ${asset} chunks from ${account} and borrowed ${loan} more`);
        return available.concat([loan]);
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
  };

  ////////////////////////////////////////
  // Exported Methods

  const getBalance = (account: Account, asset: Assets): DecimalString =>
    chunks.reduce(
      (bal, chunk) => isHeld(account, asset)(chunk) ? add(bal, chunk.quantity) : bal,
      "0",
    );

  const getAccounts = (): Account[] => Array.from(
    new Set(...chunks.map(chunk => chunk.account).filter(chunk => !!chunk))
  );

  const getNetWorth = (account?: Account): NetWorth => {
    const output = {};
    chunks.forEach(chunk => {
      if (chunk.account && (!account || chunk.account === account)) {
        output[chunk.asset] = add(output[chunk.asset], chunk.quantity);
      }
    });
    return output;
  };

  const receiveValue = (
    quantity: DecimalString,
    asset: Assets,
    account: Account,
    inputs: number[],
  ): void => {
    const balance = getBalance(account, asset);
    // If account balance is positive, add a new chunk
    if (!lt(balance, "0")) {
      mintChunk(quantity, asset, account, inputs);
      log.debug(`Received new chunk of ${quantity} ${asset} for ${account}`);
      return;
    }
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
      return;
    // If total debt is bigger than what we're receiving, annihilate what we can
    } else if (lt(quantity, debt)) {
      getChunks(mul(quantity, "-1"), asset, account).forEach(disposeDebt);
      log.debug(`Repayed debt of ${quantity} ${asset}`);
    // If total debt is smaller than what we're receiving, annihilate all debt & mint the remainer
    } else if (gt(quantity, debt)) {
      available.forEach(disposeDebt);
      const togo = sub(quantity, debt);
      mintChunk(togo, asset, account, inputs);
      log.debug(`Repayed debt of ${debt} ${asset} & minted new chunk of ${togo} ${asset}`);
    }
  };

  const disposeValue = (
    quantity: DecimalString,
    asset: Assets,
    account: Account,
    outputs: number[],
  ): void => {
    const disposeChunk = chunk => {
      chunk.disposeDate = date;
      chunk.outputs = outputs || [];
      delete chunk.account;
    };
    const balance = getBalance(account, asset);
    // If balance is negative, borrow a chunk & dispose of it
    if (lt(balance, "0")) {
      const [loan, _debt] = borrowChunk(quantity, asset, account);
      disposeChunk(loan);
      log.debug(`Borrowing & disposing ${quantity} ${asset} from ${account}`);
      return;
    } 
    // If balance is positive, dispose positive chunks before maybe taking any more loans
    const available = chunks.filter(isHeld(account, asset));
    if (eq(balance, quantity)) {
      available.forEach(disposeChunk);
      log.debug(`Disposed full balance of ${quantity} ${asset} from ${account}`);
    } else if (gt(balance, quantity)) {
      getChunks(quantity, asset, account).forEach(disposeChunk);
      log.debug(`Disposed of ${quantity} ${asset} from ${account}`);
    } else if (lt(balance, quantity)) {
      available.forEach(disposeChunk);
      const togo = sub(quantity, balance);
      const [loan, _debt] = borrowChunk(togo, asset, account);
      disposeChunk(loan);
      log.debug(`Disposed of all ${asset} from ${account} and borrowed/disposed of ${loan} more`);
    }
  };

  const moveValue = (quantity: DecimalString, asset: Assets, from: Account, to: Account): void => {
    getChunks(quantity, asset, from).forEach(chunk => {
      chunk.account = to;
    });
  };

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
    disposeValue,
    getAccounts,
    getBalance,
    getNetWorth,
  };
};
