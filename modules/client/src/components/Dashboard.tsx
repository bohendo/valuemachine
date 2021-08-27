import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import { Balances, BalanceTable } from "@valuemachine/react";
import { AddressBook, ValueMachine } from "@valuemachine/types";
import React from "react";

const useStyles = makeStyles((theme: Theme) => createStyles({
  paper: {
    padding: theme.spacing(2),
  },
}));

type DashboardProps = {
  addressBook: AddressBook;
  vm: ValueMachine;
};
export const Dashboard: React.FC<DashboardProps> = ({
  addressBook,
  vm,
}: DashboardProps) => {
  const classes = useStyles();
  return (<>
    <Typography variant="h3">
      Net Worth
    </Typography>

    <Paper className={classes.paper}>
      <Balances balances={vm.getNetWorth()}/>
    </Paper>

    <Typography variant="h3">
      Account Balances
    </Typography>

    <BalanceTable addressBook={addressBook} vm={vm}/>
  </>);
};
