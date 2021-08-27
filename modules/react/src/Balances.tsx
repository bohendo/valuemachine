import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableHead from "@material-ui/core/TableHead";
import TableCell from "@material-ui/core/TableCell";
import TableRow from "@material-ui/core/TableRow";
import React from "react";

const useStyles = makeStyles((theme: Theme) => createStyles({
  table: {
    tableLayout: "fixed",
  },
  row: {
    margin: theme.spacing(0),
    "&:last-child th, &:last-child td": {
      borderBottom: 0,
    },
  },
  column: {
    maxWidth: theme.spacing(4),
  },
}));

export const Balances = ({
  balances,
}: {
  balances: { [asset: string]: string },
}) => {
  const classes = useStyles();
  return (
    <Table size="small" className={classes.table}>
      <TableHead>
        <TableRow className={classes.row}>
          {Object.keys(balances).sort().map((asset: string, i: number) => (
            <TableCell key={i} className={classes.column}><strong> {asset} </strong></TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow className={classes.row}>
          {Object.keys(balances).sort().map((asset: string, i: number) => (
            <TableCell key={i} className={classes.column}> {balances[asset]} </TableCell>
          ))}
        </TableRow>
      </TableBody>
    </Table>
  );
};
