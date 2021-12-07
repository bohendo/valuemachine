import Typography from "@mui/material/Typography";
import React from "react";
import {
  AddressBook,
  Asset,
  BalanceTable,
  NetWorthTable,
  PriceFns,
  ValueMachine,
} from "valuemachine";

type NetWorthProps = {
  addressBook: AddressBook;
  prices: PriceFns;
  unit: Asset;
  vm: ValueMachine;
};
export const NetWorthExplorer: React.FC<NetWorthProps> = ({
  addressBook,
  prices,
  unit,
  vm,
}: NetWorthProps) => {
  return (<>
    <NetWorthTable balances={vm.getNetWorth()} prices={prices} unit={unit}/>
    <Typography variant="h3">
      Account Balances
    </Typography>
    <BalanceTable addressBook={addressBook} vm={vm}/>
  </>);
};
