import {
  AddressBook,
  AddressBookJson,
  AddressCategories,
  Assets,
  Asset,
  EthTransaction,
  Logger,
  Transaction,
  TransactionSources,
  TransactionSource,
  TransferCategories,
} from "@valuemachine/types";
import {
  assetsAreClose,
  rmDups,
  round,
  sm,
  smeq,
} from "@valuemachine/utils";

const { Internal, SwapIn, SwapOut } = TransferCategories;
const { ETH, DAI, idleDAI } = Assets;

const source = TransactionSources.Idle;

////////////////////////////////////////
/// Addresses

const idleV1Addresses = [
  { name: idleDAI, address: "0x10ec0d497824e342bcb0edce00959142aaa766dd" },
].map(row => ({ ...row, category: AddressCategories.ERC20 })) as AddressBookJson;

const idleV2Addresses = [
].map(row => ({ ...row, category: AddressCategories.ERC20 })) as AddressBookJson;

export const idleAddresses = [
  ...idleV1Addresses,
  ...idleV2Addresses,
];

////////////////////////////////////////
/// ABIs

/*
const idleV1Interface = new Interface([
  "event Rebalance(uint256 amount)",
  "event Paused(address account)",
  "event Unpaused(address account)",
  "event PauserAdded(address indexed account)",
  "event PauserRemoved(address indexed account)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
]);
*/

////////////////////////////////////////
/// Parser

const idleToToken = (token: string): string | undefined => {
  switch (token) {
  case idleDAI: return DAI;
  default: return undefined;
  }
};

export const idleParser = (
  tx: Transaction,
  ethTx: EthTransaction,
  addressBook: AddressBook,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${source}${ethTx.hash.substring(0, 6)}` });
  const { getName, isSelf } = addressBook;

  for (const txLog of ethTx.logs) {
    const address = sm(txLog.address);

    if (idleV1Addresses.some(idleToken => smeq(idleToken.address, address))) {
      tx.sources = rmDups([source, ...tx.sources]) as TransactionSource[];
      const idleTransfer = tx.transfers.find(t => t.asset === getName(address));
      if (!idleTransfer) {
        log.warn(`Can't find a transfer for ${getName(address)}`);
        continue;
      }
      const asset = idleToToken(idleTransfer.asset);
      if (!asset) {
        log.warn(`Couldn't find the asset associated with ${idleTransfer.asset}`);
        continue;
      }
      log.info(`Parsing idle transfer of ${round(idleTransfer.quantity)} ${idleTransfer.asset}`);
      const transfer = tx.transfers.find(t =>
        t.category !== Internal && t.to !== ETH
        && assetsAreClose(t.asset, asset as Asset)
        && (
          (isSelf(t.to) && isSelf(idleTransfer.from)) ||
          (isSelf(t.from) && isSelf(idleTransfer.to))
        )
      );
      if (!transfer) {
        log.warn(idleTransfer, `Couldn't find a matching ${asset} transfer`);
      } else {
        if (isSelf(transfer.from) && isSelf(idleTransfer.to)) { // deposit
          transfer.category = SwapOut;
          transfer.to = address;
          idleTransfer.category = SwapIn;
          idleTransfer.from = address;
          tx.method = "Deposit";
        } else { // withdraw
          transfer.category = isSelf(transfer.to) ? SwapIn : SwapOut;
          transfer.from = address;
          idleTransfer.category = isSelf(idleTransfer.to) ? SwapIn : SwapOut;
          idleTransfer.to = address;
          tx.method = "Withdraw";
        }
      }

    }
  }

  // log.debug(tx, `Done parsing ${source}`);
  return tx;
};


