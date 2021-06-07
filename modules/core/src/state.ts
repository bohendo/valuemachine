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
  Prices,
  State,
  StateBalances,
  StateJson,
  TimestampString,
  Transaction,
  TransactionSources,
  Transfer,
  TransferCategories,
} from "@finances/types";
import { getLogger, getJurisdiction, math } from "@finances/utils";

const { add, gt, lt, mul, round, sub } = math;

// Apps that provide insufficient info in tx logs to determine interest income
// Hacky fix: withdrawing more than we deposited is assumed to represent interest rather than debt
const isOpaqueInterestBearers = (account: Account): boolean =>
  account.startsWith(`${TransactionSources.Maker}-DSR`);

export const getState = ({
  addressBook,
  logger,
  prices,
  stateJson,
}: {
  addressBook: AddressBook;
  logger?: Logger,
  prices: Prices,
  stateJson?: StateJson;
}): State => {

  const state = stateJson || JSON.parse(JSON.stringify(emptyState));

  const log = (logger || getLogger()).child({ module: "State" });

  ////////////////////////////////////////
  // Run Init Code

  for (const address of addressBook.addresses.filter(addressBook.isSelf)) {
    state.accounts[address] = state.accounts[address] || [];
  }

  ////////////////////////////////////////
  // Internal Functions

  const haveAccount = (account: Account): boolean => {
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

  ////////////////////////////////////////
  // Exported Functions

  const toJson = (): StateJson => state;

  const createAccount = (account: Account): void => {
    state.accounts[account] = state.accounts[account] || [];
  };

  const putChunk = (account: Account, chunk: AssetChunk): void => {
    if (!haveAccount(account)) {
      log.debug(`Skipping asset put to non-self account ${account}`);
      return;
    }
    const { asset, quantity } = chunk;
    if (lt(getBalance(account, asset), "0")) {
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
    unit: Assets,
    transfer?: Transfer,
    events?: Events,
  ): AssetChunk[] => {
    // We assume nothing about the history of chunks coming to us from external parties
    if (!haveAccount(account)) {
      const receivePrice = prices.getPrice(date, asset, unit);
      if (!receivePrice) {
        log.warn(`Price in units of ${unit} is unavailable for ${asset} on ${date}`);
      }
      return [{ asset, quantity, receiveDate: date, receivePrice }];
    }
    log.debug(`Getting chunks totaling ${quantity} ${asset} from ${account}`);
    const output = [];
    let togo = quantity;
    while (gt(togo, "0")) {
      const chunk = getNextChunk(account, asset);
      log.debug(chunk, `Got next chunk of ${asset} w ${togo} to go`);
      if (!chunk) {
        // TODO: if account is an address then don't let the balance go negative?
        const currentPrice = prices.getPrice(date, asset, unit);
        const newChunk = {
          asset,
          receiveDate: date,
          receivePrice: currentPrice,
          quantity: togo,
        };
        output.push(newChunk);
        if (!isOpaqueInterestBearers(account)) {
          // Register debt by pushing a new negative-quantity chunk
          state.accounts[account].push({ ...newChunk, quantity: mul(newChunk.quantity, "-1") });
        } else {
          // Otherwise emit a synthetic transfer event
          log.warn(`Opaque interest bearer! Assuming the remaining ${togo} ${asset} is interest`);
          const assetPrice = { [unit]: currentPrice };
          const jurisdiction = getJurisdiction(account);
          if (jurisdiction !== unit) {
            assetPrice[jurisdiction] = prices.getPrice(date, asset, jurisdiction as Assets);
          }
          events?.push({
            asset,
            assetPrice,
            category: TransferCategories.Income,
            date,
            description: `Received ${round(togo)} ${asset} from (opaque) ${account}`,
            newBalances: { [transfer.to]: { [asset]: "0" }, [transfer.from]: { [asset]: "0" } },
            from: account,
            quantity: togo,
            tags: [],
            to: transfer.to,
            type: EventTypes.Transfer,
          });
          // emit an income event?
        }
        return output;
      }
      if (gt(chunk.quantity, togo)) {
        putChunk(account, { ...chunk, quantity: sub(chunk.quantity, togo) });
        output.push({ ...chunk, quantity: togo });
        return output;
      }
      output.push(chunk);
      togo = sub(togo, chunk.quantity);
      log.debug(`Put ${chunk.quantity} into output, ${togo} to go`);
    }
    return output;
  };

  const getBalance = (account: Account, asset: Assets): DecimalString =>
    !haveAccount(account)
      ? "0"
      : state.accounts[account]
        .filter(chunk => chunk.asset === asset)
        .reduce((sum, chunk) => add(sum, chunk.quantity), "0");

  const getRelevantBalances = (transaction: Transaction): StateBalances => {
    const simpleState = {} as StateBalances;
    const accounts = transaction.transfers.reduce((acc, cur) => {
      haveAccount(cur.to) && acc.push(cur.to);
      haveAccount(cur.from) && acc.push(cur.from);
      return acc;
    }, []);
    for (const account of accounts) {
      simpleState[account] = {};
      const assets = transaction.transfers.reduce((acc, cur) => {
        acc.push(cur.asset);
        return acc;
      }, []);
      for (const asset of assets) {
        simpleState[account][asset] = round(getBalance(account, asset), 8);
      }
    }
    return simpleState;
  };

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

  const touch = (lastUpdated: TimestampString): void => {
    state.lastUpdated = lastUpdated;
  };

  return {
    createAccount,
    getAllBalances,
    getBalance,
    getChunks,
    getNetWorth,
    getRelevantBalances,
    putChunk,
    toJson,
    touch,
  };
};
