import { makeStyles } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import Collapse from "@material-ui/core/Collapse";
import IconButton from "@material-ui/core/IconButton";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TablePagination from "@material-ui/core/TablePagination";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import KeyboardArrowDownIcon from "@material-ui/icons/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@material-ui/icons/KeyboardArrowUp";
import { describeTransaction } from "@valuemachine/transactions";
import {
  AddressBook,
  Transaction,
  TransactionsJson,
  Transfer,
} from "@valuemachine/types";
import { round } from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

import { HexString } from "./HexString";

const useStyles = makeStyles((theme) => ({
  row: {
    "& > *": {
      borderBottom: "unset",
      margin: theme.spacing(0),
    },
  },
}));

const TransactionRow = ({
  addressBook,
  tx,
}: {
  addressBook: AddressBook;
  tx: Transaction;
}) => {
  const [open, setOpen] = useState(false);
  const classes = useStyles();
  return (
    <React.Fragment>
      <TableRow className={classes?.row || ""}>
        <TableCell> {
          (new Date(tx.date)).toISOString().replace("T", " ").replace(".000Z", "")
        } </TableCell>
        <TableCell> {describeTransaction(addressBook, tx)} </TableCell>
        <TableCell> {tx.hash ? <HexString value={tx.hash} /> : "N/A"} </TableCell>
        <TableCell> {tx.sources.join(", ")} </TableCell>
        <TableCell onClick={() => setOpen(!open)} style={{ minWidth: "140px" }}>
          {`${tx.transfers.length} transfer${tx.transfers.length === 1 ? "" : "s"}`}
          <IconButton aria-label="expand row" size="small" >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box pb={2} px={4}>
              <Typography variant="h6" gutterBottom component="div">
                Transfers
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong> Category </strong></TableCell>
                    <TableCell><strong> Asset </strong></TableCell>
                    <TableCell><strong> Amount </strong></TableCell>
                    <TableCell><strong> From </strong></TableCell>
                    <TableCell><strong> To </strong></TableCell>
                    <TableCell><strong> Index </strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tx.transfers.map((transfer: Transfer, i: number) => (
                    <TableRow key={i}>
                      <TableCell> {transfer.category} </TableCell>
                      <TableCell> {transfer.asset} </TableCell>
                      <TableCell> {round(transfer.quantity, 4)} </TableCell>
                      <TableCell>
                        <HexString
                          display={addressBook?.getName(transfer.from)}
                          value={transfer.from}
                        />
                      </TableCell>
                      <TableCell>
                        <HexString
                          display={addressBook?.getName(transfer.to)}
                          value={transfer.to}
                        />
                      </TableCell>
                      <TableCell> {transfer.index} </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
};

export const TransactionTable = ({
  addressBook,
  //classes,
  transactionsJson,
}: {
  addressBook: AddressBook;
  //classes?: any;
  transactionsJson: TransactionsJson;
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);

  useEffect(() => {
    setPage(0);
  }, [transactionsJson, addressBook]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  return (
    <React.Fragment>

      <TableContainer>

        {/*
        */}

        <TablePagination
          rowsPerPageOptions={[25, 50, 100, 250]}
          component="div"
          count={transactionsJson.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong> Date </strong></TableCell>
              <TableCell><strong> Description </strong></TableCell>
              <TableCell><strong> Hash </strong></TableCell>
              <TableCell><strong> Sources </strong></TableCell>
              <TableCell><strong> Transfers </strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactionsJson
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((tx: Transaction, i: number) => (
                <TransactionRow addressBook={addressBook} key={i} tx={tx} />
              ))
            }
          </TableBody>
        </Table>

        <TablePagination
          rowsPerPageOptions={[25, 50, 100, 250]}
          component="div"
          count={transactionsJson.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />

      </TableContainer>

    </React.Fragment>
  );
};
