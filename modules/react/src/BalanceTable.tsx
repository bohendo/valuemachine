import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableHead from "@material-ui/core/TableHead";
import TableCell from "@material-ui/core/TableCell";
import TableRow from "@material-ui/core/TableRow";
import { AddressBook, ValueMachine } from "@valuemachine/types";
import React, { useEffect, useState } from "react";

import { Balances } from "./Balances";
import { HexString } from "./HexString";

const useStyles = makeStyles((theme: Theme) => createStyles({
  paper: {
    padding: theme.spacing(2),
  },
  table: {
    padding: theme.spacing(1),
  },
  accountCell: {
    maxWidth: "18em",
    "& > *": {
      marginRight: theme.spacing(0),
    },
  },
  balanceCell: {
    maxWidth: "18em",
    "& > *": {
      marginRight: theme.spacing(0),
    },
  },
}));

type BalanceTableProps = {
  addressBook: AddressBook;
  vm: ValueMachine;
};
export const BalanceTable: React.FC<BalanceTableProps> = ({
  addressBook,
  vm,
}: BalanceTableProps) => {
  const [allBalances, setAllBalances] = useState({});
  console.log(`We have ${addressBook?.addresses?.length} addresses`);
  const classes = useStyles();

  useEffect(() => {
    if (!addressBook || !vm) return;
    const accounts = vm.getAccounts();
    setAllBalances(accounts.reduce((balances, account) => {
      balances[account] = vm.getNetWorth(account);
      return balances;
    }, {}));
  }, [addressBook, vm]);

  console.log(`Rendering balances`, allBalances);

  return (
    <Paper className={classes.paper}>

      <Table size="small" className={classes.table}>
        <TableHead>
          <TableRow>
            <TableCell><strong> Account  </strong></TableCell>
            <TableCell><strong> Balances </strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(allBalances)
            .map(([account, balances]: any, i: number) => (
              <TableRow key={i}>
                <TableCell className={classes.accountCell}>
                  <HexString value={account} display={addressBook.getName(account)}/>
                </TableCell>
                <TableCell className={classes.balanceCell}>
                  <Balances balances={balances}/>
                </TableCell>
              </TableRow>
            ))
          }
        </TableBody>
      </Table>

    </Paper>
  );

};
