import { AddressZero } from "@ethersproject/constants";
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
  State,
  StateBalances,
  StateJson,
  TimestampString,
  TransactionSources,
  TransferCategories,
} from "@finances/types";
import { getLogger, math } from "@finances/utils";

const { add, gt, lt, mul, round, sub } = math;

// Apps that provide insufficient info in tx logs to determine interest income
// Hacky fix: withdrawing more than we deposited is assumed to represent interest rather than debt
const isOpaqueInterestBearers = (account: Account): boolean =>
  account.startsWith(`${TransactionSources.Maker}-DSR`);

export const getState = ({
  addressBook,
  logger,
  stateJson,
}: {
  addressBook: AddressBook;
  logger?: Logger,
  stateJson?: StateJson;
}): State => {
  const state = stateJson || JSON.parse(JSON.stringify(emptyState));

  if (!state.history) state.history = [];

  const log = (logger || getLogger()).child({ module: "State" });

  ////////////////////////////////////////
  // Internal Functions

  const hasAccount = (account: Account): boolean => {
    if (account === AddressZero) {
      return false;
    } else if (state.accounts[account]) {
      return true;
    } else if (addressBook.isSelf(account)) {
      state.accounts[account] = [];
      return true;
    } else {
      return false;
    }
  };

  const getNextChunk = (account: Account, asset: Assets): AssetChunk => {
    // TODO: find the one w smallest/largest change in value since we got it
    const index = state.accounts[account].findIndex(chunk => chunk.asset === asset);
    if (index === -1) return undefined;
    return state.accounts[account].splice(index, 1)[0];
  };

  const mintChunk = (
    asset: Assets,
    quantity: DecimalString,
    receiveDate: TimestampString,
    sources = [],
  ): AssetChunk => {
    const index = state.totalChunks++;
    log.debug(`Created chunk #${index} of ${quantity} ${asset} received on ${receiveDate}`);
    return { asset, index, quantity, receiveDate, unsecured: quantity, sources };
  };

  ////////////////////////////////////////
  // Exported Functions

  const toJson = (): StateJson => state;

  const touch = (lastUpdated: TimestampString): void => {
    state.lastUpdated = lastUpdated;
  };

  const createAccount = (account: Account): void => {
    state.accounts[account] = state.accounts[account] || [];
  };

  const disposeChunk = (
    chunk: AssetChunk,
  ): void => {
    state.history?.push(chunk);
    log.debug(`Disposing chunk #${chunk.index} of ${chunk.quantity} ${chunk.asset}`);
  };


  const putChunk = (
    chunk: AssetChunk,
    account: Account,
  ): void => {
    if (!hasAccount(account)) {
      log.warning(`Improperly putting chunk of ${chunk.quantity} ${chunk.asset} into ${account}`);
      return disposeChunk(chunk);
    }
    const { asset, quantity } = chunk;
    if (lt(getBalance(account, asset), "0") && gt(chunk.quantity, "0")) {
      // annihilate negative chunks before adding positive ones
      let togo = quantity;
      while (gt(togo, "0")) {
        const hunk = getNextChunk(account, asset);
        if (!hunk) {
          // Push the remaining payment after debt is consumed
          log.debug(`Putting remaining payment of ${togo} ${asset} into account ${account}`);
          state.accounts[account].push({ ...chunk, quantity: togo });
          return;
        }
        const leftover = add(hunk.quantity, togo); // negative if debt is bigger
        if (lt(leftover, "0")) {
          // Push the remaining debt after payment is consumed
          log.debug(`Replacing leftover debt chunk of ${leftover} ${asset} into account ${account}`);
          state.accounts[account].push({ ...hunk, quantity: leftover });
          return;
        }
        togo = leftover;
        log.debug(`Anniilated debt chunk of ${hunk.quantity} ${hunk.asset}, ${togo} to go`);
      }
    } else {
      log.debug(`Putting ${quantity} ${asset} into account ${account}`);
      state.accounts[account].push(chunk);
    }
  };

  const getChunks = (
    account: Account,
    asset: Assets,
    quantity: DecimalString,
    date: TimestampString,
    events?: Events,
  ): AssetChunk[] => {
    if (!hasAccount(account)) { // Received a new chunk
      log.warn(`Improperly receiving chunk of ${quantity} ${asset} from ${account}`);
      return [mintChunk(asset, quantity, date)]; // incoming chunk has no sources
    }
    log.debug(`Searching for chunks totaling ${quantity} ${asset} in account ${account} `);
    const output = [];
    let togo = quantity;
    while (gt(togo, "0")) {
      const chunk = getNextChunk(account, asset);
      if (!chunk) {
        log.debug(`Account ${account} has no ${asset}`);
        // TODO: if account is an address then don't let the balance go negative?
        const newChunk = mintChunk(asset, togo, date); // debt has no sources
        output.push(newChunk);
        if (!isOpaqueInterestBearers(account)) {
          // Register debt by pushing a new negative-quantity chunk
          const debtChunk = mintChunk(asset, mul(togo, "-1"), date); // debt has no sources
          putChunk(debtChunk, account);
        } else {
          // Otherwise emit a synthetic transfer event
          log.warn(`Opaque interest bearer! Assuming the remaining ${togo} ${asset} is interest`);
          events?.push({
            asset,
            category: TransferCategories.Income,
            date,
            description: `Received ${round(togo)} ${asset} from (opaque) ${account}`,
            newBalances: {}, // unknown bc this source is opaque
            from: account.split("-").slice(0, account.split("-").length - 1).join("-"),
            quantity: togo,
            tags: [],
            to: account,
            type: EventTypes.Transfer,
          });
        }
        return output;
      } else if (lt(chunk.quantity, "0")) {
        log.debug(`Got a debt chunk of ${chunk.quantity} ${chunk.asset}`);
        // If we got a debt chunk, put it back
        putChunk(chunk, account);
        // create a new chunk/debt chunk pair to account for what we need
        const newChunk = mintChunk(asset, togo, date); // debt has no sources
        output.push(newChunk);
        const debtChunk = mintChunk(asset, mul(togo, "-1"), date); // debt has no sources
        putChunk(debtChunk, account);
        return output;
      }
      log.debug(`Got chunk #${chunk.index} of ${chunk.quantity} ${asset} w ${togo} to go`);
      if (gt(chunk.quantity, togo)) {
        // create a new chunk for the output we're giving away
        output.push(mintChunk(chunk.asset, togo, chunk.receiveDate, chunk.sources));
        // resize the old leftover chunk and put it back
        putChunk({ ...chunk, quantity: sub(chunk.quantity, togo) }, account);
        return output;
      }
      output.push(chunk);
      togo = sub(togo, chunk.quantity);
      log.debug(`Put ${chunk.quantity} into output, ${togo} to go`);
    }
    return output;
  };

  /*
  // Given a chunk and one of that chunk's sources, return a value between 0 and 1
  // Returned value represents the proportion of the source that went into the chunk
  const getProportion = (chunk, source): DecimalString => {
    // Search through all chunks & find ones that 
    const allChunks 
  };
  */

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

  const getBalance = (account: Account, asset: Assets): DecimalString =>
    !hasAccount(account)
      ? "0"
      : state.accounts[account]
        .filter(chunk => chunk.asset === asset)
        .reduce((sum, chunk) => add(sum, chunk.quantity), "0");

  const getAllBalances = (): StateBalances => {
    const output = {} as StateBalances;
    for (const account of Object.keys(state.accounts)) {
      const assets = state.accounts[account].reduce((acc, cur) => {
        if (!acc.includes(cur.asset)) {
          acc.push(cur.asset);
        }
        return acc;
      }, []);
      for (const asset of assets) {
        output[account] = output[account] || {};
        output[account][asset] = getBalance(account, asset);
      }
    }
    return output;
  };

  const getNetWorth = (): NetWorth => {
    const output = {};
    const allBalances = getAllBalances();
    for (const account of Object.keys(allBalances)) {
      for (const asset of Object.keys(allBalances[account])) {
        output[asset] = output[asset] || "0";
        output[asset] = add(output[asset], allBalances[account][asset]);
      }
    }
    return output;
  };

  return {
    createAccount,
    disposeChunk,
    getAllBalances,
    getBalance,
    getChunks,
    secureChunk,
    getNetWorth,
    mintChunk,
    putChunk,
    toJson,
    touch,
  };
};
