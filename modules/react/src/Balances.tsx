import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableRow from "@material-ui/core/TableRow";
import React from "react";
import { gt } from "@valuemachine/utils";

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
      <TableBody>
        {Object.entries(balances).sort().map(([asset, bal]: string[], i: number) => gt(bal, "0") ? (
          <TableRow  key={i} className={classes.row}>
            <TableCell className={classes.column}> {asset} </TableCell>
            <TableCell className={classes.column}> {bal} </TableCell>
          </TableRow>
        ) : null)}
      </TableBody>
    </Table>
  );
};
