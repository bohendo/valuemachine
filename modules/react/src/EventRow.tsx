import { isHexString } from "@ethersproject/bytes";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import Collapse from "@material-ui/core/Collapse";
import IconButton from "@material-ui/core/IconButton";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import KeyboardArrowDownIcon from "@material-ui/icons/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@material-ui/icons/KeyboardArrowUp";
import {
  AddressBook,
  Event,
  EventTypes,
  GuardChangeEvent,
} from "@valuemachine/types";
import { describeChunk, describeEvent } from "@valuemachine/core";
import React, { useEffect, useState } from "react";

import { HexString } from "./HexString";

const useStyles = makeStyles((theme: Theme) => createStyles({
  subtitle: {
    margin: theme.spacing(2),
  },
  subtable: {
    maxWidth: theme.spacing(12),
  },
}));

type EventRowProps = {
  addressBook: AddressBook;
  event: Event;
};
export const EventRow: React.FC<EventRowProps> = ({
  addressBook,
  event,
}: EventRowProps) => {
  const [open, setOpen] = useState(false);
  const classes = useStyles();

  useEffect(() => {
    if (event && open) console.log(event);
  }, [event, open]);

  const chunksToDisplay = (chunks, prefix?: string) => {
    const output = {};
    for (const chunk of chunks) {
      output[`${prefix}Chunk #${chunk.index}`] = describeChunk(chunk);
    }
    return output;
  };

  const SimpleTable = ({
    data,
  }: {
    data: { [key: string]: string };
  }) => {
    return (
      <Table size="small">
        <TableBody>
          {Object.entries(data).map((e: string[], i: number) => {
            const key = e[0] as string;
            const value = e[1] as string;
            return (
              <TableRow key={i}>
                <TableCell className={classes.subtable}><strong> {key} </strong></TableCell>
                <TableCell> {
                  isHexString(value)
                    ? <HexString value={value} display={addressBook?.getName(value)}/>
                    : <Typography> {
                      typeof value === "string" ? value : JSON.stringify(value)
                    } </Typography>
                }</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <React.Fragment>
      <TableRow>
        <TableCell> {event.date.replace("T", " ").replace(".000Z", "")} </TableCell>
        <TableCell> {event.type} </TableCell>
        <TableCell> {describeEvent(event)} </TableCell>
        <TableCell onClick={() => setOpen(!open)} style={{ minWidth: "140px" }}>
          Details
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
                {`${event.type} Details`}
              </Typography>
              <SimpleTable data={

                (event.type === EventTypes.Expense) ? {
                  Account: event.account,
                  ...chunksToDisplay(event.outputs),

                } : event.type === EventTypes.Income ? {
                  Account: event.account,
                  ...chunksToDisplay(event.inputs),

                } : event.type === EventTypes.Debt ? {
                  Account: event.account,
                  ...chunksToDisplay(event.outputs, "Gave "),
                  ...chunksToDisplay(event.inputs, "Took "),

                } : event.type === EventTypes.GuardChange ? {
                  ["From"]: (event as GuardChangeEvent).from,
                  ["To"]: (event as GuardChangeEvent).to,
                  ...chunksToDisplay(event.chunks),

                } : event.type === EventTypes.Trade ? {
                  Account: event.account,
                  ...chunksToDisplay(event.outputs, "Gave "),
                  ...chunksToDisplay(event.inputs, "Took "),
                } : {}
              }/>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
};
