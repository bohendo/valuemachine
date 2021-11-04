import { isHexString } from "@ethersproject/bytes";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import {
  AddressBook,
  EventTypes,
  GuardChangeEvent,
  HydratedEvent,
  TxTags,
} from "@valuemachine/types";
import { describeChunk, describeEvent } from "@valuemachine/core";
import React, { useEffect, useState } from "react";

import { HexString } from "../utils";

type EventRowProps = {
  addressBook?: AddressBook;
  event: HydratedEvent;
  txTags?: TxTags;
};
export const EventRow: React.FC<EventRowProps> = ({
  addressBook,
  event,
  txTags,
}: EventRowProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (event && open) console.log(event);
  }, [event, open]);

  const accountsToDisplay = accounts => accounts.reduce((display, account, index) => {
    display[`Account ${index}`] = account;
    return display;
  }, {});

  const chunksToDisplay = (chunks, prefix?: string) => {
    const output = {};
    for (const chunk of chunks) {
      if (!chunk?.index) {
        console.warn(chunk, `Invalid chunk`);
        continue;
      }
      output[`${prefix || ""}Chunk #${chunk.index}`] = describeChunk(chunk);
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
                <TableCell sx={{ maxWidth: "8em" }}><strong> {key} </strong></TableCell>
                <TableCell> {
                  isHexString(value?.split("/")?.pop())
                    ? <HexString value={value} display={addressBook?.getName(value, true)}/>
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
        <TableCell onClick={() => setOpen(!open)} sx={{ p: 1, maxWidth: "4em" }}>
          <IconButton aria-label="expand row" size="small" >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell> {event.date.replace("T", " ").replace(".000Z", "")} </TableCell>
        <TableCell> {event.type} </TableCell>
        <TableCell> {describeEvent(event)} </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box pb={2} px={4}>
              <Typography variant="h6" gutterBottom component="div">
                {`${event.type} Details`}
              </Typography>
              <SimpleTable data={

                event.type === EventTypes.Expense ? {
                  Account: event.account,
                  To: event.to,
                  ["Tx Id"]: event.txId,
                  Tags: JSON.stringify(txTags?.[event.txId]),
                  ...chunksToDisplay(event.outputs),

                } : event.type === EventTypes.Income ? {
                  Account: event.account,
                  From: event.from,
                  ["Tx Id"]: event.txId,
                  Tags: JSON.stringify(txTags?.[event.txId]),
                  ...chunksToDisplay(event.inputs),

                } : event.type === EventTypes.Debt ? {
                  Account: event.account,
                  ["Tx Id"]: event.txId,
                  Tags: JSON.stringify(txTags?.[event.txId]),
                  ...chunksToDisplay(event.outputs, "Gave "),
                  ...chunksToDisplay(event.inputs, "Took "),

                } : event.type === EventTypes.GuardChange ? {
                  ["From"]: (event as GuardChangeEvent).from,
                  ["To"]: (event as GuardChangeEvent).to,
                  ["Tx Id"]: event.txId,
                  Tags: JSON.stringify(txTags?.[event.txId]),
                  ...chunksToDisplay(event.chunks),

                } : event.type === EventTypes.Trade ? {
                  Account: event.account,
                  ["Tx Id"]: event.txId,
                  Tags: JSON.stringify(txTags?.[event.txId]),
                  ...chunksToDisplay(event.outputs, "Gave "),
                  ...chunksToDisplay(event.inputs, "Took "),

                } : event.type === EventTypes.Error ? {
                  ["Tx Id"]: event.txId,
                  Tags: JSON.stringify(txTags?.[event.txId]),
                  ["Error Code"]: event.code,
                  ...accountsToDisplay(event.accounts),

                } : {}
              }/>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
};
