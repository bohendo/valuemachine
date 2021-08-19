import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TablePagination from "@material-ui/core/TablePagination";
import TableRow from "@material-ui/core/TableRow";
import {
  AddressBook,
  Transaction,
  TransactionsJson,
} from "@valuemachine/types";
import React, { useEffect, useState } from "react";

import { TransactionRow } from "./TransactionRow";

export const TransactionTable = ({
  addressBook,
  transactionsJson,
}: {
  addressBook: AddressBook;
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
