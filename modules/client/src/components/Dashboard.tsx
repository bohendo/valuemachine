import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Divider from "@material-ui/core/Divider";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import { AddressBook, ValueMachine } from "@valuemachine/types";
import React, { useEffect, useState } from "react";

const useStyles = makeStyles((theme: Theme) => createStyles({
  table: {
    margin: theme.spacing(1),
  },
  subTable: {
    margin: theme.spacing(0),
    "&:last-child th, &:last-child td": {
      borderBottom: 0,
    },
  },
  accounts: {
    maxWidth: "18em",
    "& > *": {
      marginRight: theme.spacing(0),
    },
  },
  assets: {
    width: "10em",
  },
}));

export const BalanceTable = ({
  balances,
}: {
  balances: { [asset: string]: string },
}) => {
  const classes = useStyles();
  return (
    <Table size="small">
      <TableBody>
        {Object.entries(balances).map(([asset, balance]: string[], i: number) => (
          <TableRow key={i} className={classes.subTable}>
            <TableCell className={classes.assets}> {asset} </TableCell>
            <TableCell> {balance} </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

type PropTypes = {
  addressBook: AddressBook;
  vm: ValueMachine;
};
export const Dashboard: React.FC<PropTypes> = ({
  addressBook,
  vm,
}: PropTypes) => {
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

  return (<>

    <Typography variant="h3">
      Account Balances
    </Typography>
    <Divider/>

    <Table size="small" className={classes.table}>
      <TableBody>
        {Object.entries(allBalances)
          .map(([account, balances]: any, i: number) => (
            <TableRow key={i}>
              <TableCell className={classes.accounts}>
                <Typography noWrap>
                  {account}
                </Typography>
              </TableCell>
              <TableCell>
                <BalanceTable balances={balances}/>
              </TableCell>
            </TableRow>
          ))
        }
      </TableBody>
    </Table>

  </>);

};
