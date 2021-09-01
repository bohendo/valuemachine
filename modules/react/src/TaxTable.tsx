import { commify } from "@ethersproject/units";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableContainer from "@material-ui/core/TableContainer";
import TableHead from "@material-ui/core/TableHead";
import TablePagination from "@material-ui/core/TablePagination";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import {
  Assets,
} from "@valuemachine/transactions";
import {
  AddressBook,
  Asset,
  DateString,
  DecimalString,
  EventTypes,
  Guard,
  GuardChangeEvent,
  Guards,
  Prices,
  TradeEvent,
  ValueMachine,
} from "@valuemachine/types";
import {
  add,
  mul,
  round as defaultRound,
  sub,
} from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

const { ETH } = Assets;

// Every guard has exactly one special asset that it uses to accept security fees
const securityFeeAssetMap = {
  [Guards.Bitcoin]: Assets.BTC,
  [Guards.BitcoinCash]: Assets.BCH,
  [Guards.Ethereum]: Assets.ETH,
  [Guards.EthereumClassic]: Assets.ETC,
  [Guards.Litecoin]: Assets.LTC,
  [Guards.Polygon]: Assets.MATIC,
  [Guards.CZE]: Assets.CZK,
  [Guards.EST]: Assets.EUR,
  [Guards.GBR]: Assets.GBP,
  [Guards.IND]: Assets.INR,
  [Guards.ROU]: Assets.EUR,
  [Guards.USA]: Assets.USD,
} as const;

const useStyles = makeStyles((theme: Theme) => createStyles({
  root: {
    margin: theme.spacing(1),
  },
  paper: {
    minWidth: "500px",
    padding: theme.spacing(2),
  },
  select: {
    margin: theme.spacing(3),
    minWidth: "160px",
  },
  title: {
    paddingTop: theme.spacing(2),
  },
  exportButton: {
    marginBottom: theme.spacing(4),
    marginLeft: theme.spacing(4),
    marginRight: theme.spacing(4),
    marginTop: theme.spacing(0),
  },
  exportCard: {
    margin: theme.spacing(2),
    minWidth: "255px",
  },
}));

type TaxRow = {
  date: DateString;
  action: string;
  amount: DecimalString;
  asset: Asset;
  price: DecimalString;
  value: DecimalString;
  receiveDate: DateString;
  receivePrice: DecimalString;
  capitalChange: DecimalString;
  cumulativeChange: DecimalString;
  cumulativeIncome: DecimalString;
};

type TaxTableProps = {
  addressBook: AddressBook;
  guard: Guard;
  prices: Prices;
  vm: ValueMachine;
};
export const TaxTable: React.FC<TaxTableProps> = ({
  addressBook,
  guard,
  prices,
  vm,
}: TaxTableProps) => {
  const classes = useStyles();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [taxes, setTaxes] = React.useState([] as TaxRow[]);
  const [feeAsset, setFeeAsset] = React.useState(ETH);

  const fmtNum = num => {
    const round = defaultRound(num, guard === Guards.Ethereum ? 4 : 2);
    const insert = (str: string, index: number, char: string = ",") =>
      str.substring(0, index) + char + str.substring(index);
    if (guard === Guards.IND) {
      const neg = round.startsWith("-") ? "-" : "";
      const [int, dec] = round.replace("-", "").split(".");
      const len = int.length;
      if (len <= 3) {
        return round;
      } else if (len <= 5) {
        return `${neg}${insert(int, len - 3)}.${dec}`;
      } else if (len <= 7) {
        return `${neg}${insert(insert(int, len - 3), len - 5)}.${dec}`;
      } else if (len <= 9) {
        return `${neg}${
          insert(insert(insert(int, len - 3), len - 5), len - 7)
        }.${dec}`;
      } else {
        return `${neg}${
          insert(insert(insert(insert(int, len - 3), len - 5), len - 7), len - 9)
        }.${dec}`;
      }
    }
    return commify(round);
  };

  useEffect(() => {
    setFeeAsset(securityFeeAssetMap[guard]);
  }, [guard]);

  useEffect(() => {
    if (!addressBook || !guard || !vm?.json?.events?.length) return;
    let cumulativeIncome = "0";
    let cumulativeChange = "0";
    setTaxes(
      vm?.json?.events.filter(evt => {
        const toJur = (
          (evt as GuardChangeEvent).to || (evt as TradeEvent).account || ""
        ).split("/")[0];
        return toJur === guard && (
          evt.type === EventTypes.Trade
          || evt.type === EventTypes.GuardChange
          || evt.type === EventTypes.Income
        );
      }).reduce((output, evt) => {
        const date = (evt as any).date || new Date().toISOString();
        if (evt.type === EventTypes.Trade) {
          return output.concat(...evt.outputs?.map(chunkIndex => {
            const chunk = vm.getChunk(chunkIndex);
            const price = prices.getPrice(date, chunk.asset);
            const value = mul(chunk.quantity, price || "0");
            if (chunk.history[0]?.date) {
              const receivePrice = prices.getPrice(chunk.history[0]?.date, chunk.asset);
              const capitalChange = mul(chunk.quantity, sub(price || "0", receivePrice || "0"));
              cumulativeChange = add(cumulativeChange, capitalChange);
              return {
                date: date,
                action: EventTypes.Trade,
                amount: chunk.quantity,
                asset: chunk.asset,
                price,
                value,
                receivePrice,
                receiveDate: date, // wrong!
                capitalChange,
                cumulativeChange,
                cumulativeIncome,
              } as TaxRow;
            } else {
              return {
                date: date,
                receiveDate: date, // wrong!
              } as TaxRow;
            }
          }));
        } else if (evt.type === EventTypes.Income) {
          const price = prices.getPrice(date, ETH/*TODO evt.asset*/);
          const income = mul("0"/*TODO evt.quantity*/, price || "0");
          cumulativeIncome = add(cumulativeIncome, income);
          return output.concat({
            date: date,
            action: EventTypes.Income,
            amount: "0", // TODO evt.quantity,
            asset: ETH, // TODO evt.asset
            price,
            value: income,
            receivePrice: price,
            receiveDate: date,
            capitalChange: "0",
            cumulativeChange,
            cumulativeIncome,
          } as TaxRow);
        } else if (evt.type === EventTypes.GuardChange) {
          console.warn(evt, `Temporarily pretending this guard change is income`);
          const price = prices.getPrice(date, ETH /*TODO evt.asset*/);
          const income = mul("0"/*TODO evt.quantity*/, price || "0");
          cumulativeIncome = add(cumulativeIncome, income);
          return output.concat({
            date: date,
            action: EventTypes.GuardChange,
            amount: "0", // TODO evt.quantity,
            asset: ETH, // TODO evt.asset
            price,
            value: income,
            receivePrice: price,
            receiveDate: date,
            capitalChange: "0",
            cumulativeChange,
            cumulativeIncome,
          } as TaxRow);
        } else {
          return output;
        }
      }, [] as TaxRow[])
    );
  }, [addressBook, guard, vm, prices]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  return (
    <Paper className={classes.paper}>

      <Typography align="center" variant="h4" className={classes.title} component="div">
        {`${taxes.length} Taxable ${guard} Events`}
      </Typography>

      <TableContainer>
        <TablePagination
          rowsPerPageOptions={[25, 50, 100, 250]}
          component="div"
          count={taxes.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong> Date </strong></TableCell>
              <TableCell><strong> Action </strong></TableCell>
              <TableCell><strong> Asset </strong></TableCell>
              <TableCell><strong> {`Price (${feeAsset}/Asset)`} </strong></TableCell>
              <TableCell><strong> {`Value (${feeAsset})`} </strong></TableCell>
              <TableCell><strong> Receive Date </strong></TableCell>
              <TableCell><strong> {`Receive Price (${feeAsset}/Asset)`} </strong></TableCell>
              <TableCell><strong> {`Capital Change (${feeAsset})`} </strong></TableCell>
              <TableCell><strong> {`Cumulative Change (${feeAsset})`} </strong></TableCell>
              <TableCell><strong> {`Cumulative Income (${feeAsset})`} </strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {taxes
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row: TaxRow, i: number) => (
                <TableRow key={i}>
                  <TableCell> {row.date.replace("T", " ").replace(".000Z", "")} </TableCell>
                  <TableCell> {row.action} </TableCell>
                  <TableCell> {`${fmtNum(row.amount)} ${row.asset}`} </TableCell>
                  <TableCell> {fmtNum(row.price)} </TableCell>
                  <TableCell> {fmtNum(row.value)} </TableCell>
                  <TableCell> {row.receiveDate.replace("T", " ").replace(".000Z", "")} </TableCell>
                  <TableCell> {fmtNum(row.receivePrice)} </TableCell>
                  <TableCell> {fmtNum(row.capitalChange)} </TableCell>
                  <TableCell> {fmtNum(row.cumulativeChange)} </TableCell>
                  <TableCell> {fmtNum(row.cumulativeIncome)} </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[25, 50, 100, 250]}
          component="div"
          count={taxes.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Paper>
  );
};
