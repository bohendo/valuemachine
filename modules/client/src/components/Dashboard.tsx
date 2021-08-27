import Divider from "@material-ui/core/Divider";
import Typography from "@material-ui/core/Typography";
import { BalanceTable } from "@valuemachine/react";
import { AddressBook, ValueMachine } from "@valuemachine/types";
import React from "react";

type DashboardProps = {
  addressBook: AddressBook;
  vm: ValueMachine;
};
export const Dashboard: React.FC<DashboardProps> = ({
  addressBook,
  vm,
}: DashboardProps) => {
  return (<>
    <Typography variant="h3">
      Current Balances
    </Typography>

    <BalanceTable addressBook={addressBook} vm={vm}/>
  </>);
};
