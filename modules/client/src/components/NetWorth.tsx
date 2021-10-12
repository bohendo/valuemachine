import Typography from "@material-ui/core/Typography";
import { BalanceTable, NetWorthTable } from "@valuemachine/react";
import { AddressBook, Asset, Prices, ValueMachine } from "@valuemachine/types";
import React from "react";

type NetWorthProps = {
  addressBook: AddressBook;
  prices: Prices;
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
