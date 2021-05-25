import {
  AddressBook,
  Assets,
  Transfer,
  AddressBookJson,
  AddressCategories,
  ChainData,
  EthTransaction,
  Logger,
  Transaction,
  TransactionSources,
  TransferCategories,
} from "@finances/types";
import { math, smeq } from "@finances/utils";

import { rmDups } from "../utils";

const { round } = math;
const { TORN } = Assets;

const source = TransactionSources.Tornado;

////////////////////////////////////////
/// Addresses

// vTORN is non-transferrable so is not an ERC20
const miscAddresses = [
  { name: "vTORN-airdropper", address: "0x4e7b3769921c8dfbdb3d1b4c73558db079a180c7" },
  { name: "vTORN", address: "0x3efa30704d2b8bbac821307230376556cf8cc39e" },
].map(row => ({ ...row, category: AddressCategories.Defi })) as AddressBookJson;

const govTokenAddresses = [
  { name: TORN, address: "0x77777feddddffc19ff86db637967013e6c6a116c" },
].map(row => ({ ...row, category: AddressCategories.ERC20 })) as AddressBookJson;

const mixerAddresses = [
  { name: "tornado-proxy", address: "0x905b63fff465b9ffbf41dea908ceb12478ec7601" }, // old
  { name: "tornado-proxy", address: "0x722122df12d4e14e13ac3b6895a86e84145b6967" }, // new
  { name: "tornado-relayer", address: "0xb541fc07bc7619fd4062a54d96268525cbc6ffef" },
  { name: "tornado-dai-100", address: "0xd4b88df4d29f5cedd6857912842cff3b20c8cfa3" },
  { name: "tornado-dai-1000", address: "0xfd8610d20aa15b7b2e3be39b396a1bc3516c7144" },
  { name: "tornado-dai-10000", address: "0x07687e702b410fa43f4cb4af7fa097918ffd2730" },
  { name: "tornado-dai-100000", address: "0x23773e65ed146a459791799d01336db287f25334" },
  { name: "tornado-eth-01", address: "0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc" },
  { name: "tornado-eth-1", address: "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936" },
  { name: "tornado-eth-10", address: "0x910cbd523d972eb0a6f4cae4618ad62622b39dbf" },
  { name: "tornado-eth-100", address: "0xa160cdab225685da1d56aa342ad8841c3b53f291" },
  { name: "tornado-mixer", address: "0x94a1b5cdb22c43faab4abeb5c74999895464ddaf" },
  { name: "tornado-wbtc-01", address: "0x178169b423a011fff22b9e3f3abea13414ddd0f1" },
  { name: "tornado-wbtc-1", address: "0x610b717796ad172b316836ac95a2ffad065ceab4" },
  { name: "tornado-wbtc-10", address: "0xbb93e510bbcd0b7beb5a853875f9ec60275cf498" },
].map(row => ({ ...row, category: AddressCategories.Defi })) as AddressBookJson;

export const tornadoAddresses = [
  ...govTokenAddresses,
  ...miscAddresses,
  ...mixerAddresses,
];

////////////////////////////////////////
/// ABIs
////////////////////////////////////////
/// Parser

export const tornadoParser = (
  tx: Transaction,
  ethTx: EthTransaction,
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
): Transaction => {
  const log = logger.child({ module: `${source}${ethTx.hash.substring(0, 6)}` });
  const { getName, isSelf } = addressBook;

  const deposits = tx.transfers.filter((transfer: Transfer): boolean =>
    isSelf(transfer.from)
      && mixerAddresses.some(e => smeq(transfer.to, e.address))
      && ([
        TransferCategories.Transfer,
        TransferCategories.Deposit,
      ] as TransferCategories[]).includes(transfer.category)
  );

  const withdraws = tx.transfers.filter((transfer: Transfer): boolean =>
    isSelf(transfer.to)
      && mixerAddresses.some(e => smeq(transfer.from, e.address))
      && ([
        TransferCategories.Transfer, 
        TransferCategories.Withdraw,
      ] as TransferCategories[]).includes(transfer.category)
  );

  if (deposits.length || withdraws.length) {
    tx.sources = rmDups([source, ...tx.sources]) as TransactionSources[];
  }

  deposits.forEach(deposit => {
    deposit.category = TransferCategories.Deposit;
    const amt = round(deposit.quantity);
    const asset = deposit.asset;
    log.info(`Found deposit of ${amt} ${asset} to ${source}`);
    tx.description = `${getName(deposit.from)} deposited ${amt} ${asset} into ${source}`;
  });

  withdraws.forEach(withdraw => {
    withdraw.category = TransferCategories.Withdraw;
    const amt = round(withdraw.quantity);
    const asset = withdraw.asset;
    log.info(`Found withdraw of ${amt} ${asset} from ${source}`);
    tx.description = `${getName(withdraw.to)} withdrew ${amt} ${asset} from ${source}`;
  });

  // log.debug(tx, `Done parsing ${source}`);
  return tx;
};

