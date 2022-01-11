import AddIcon from "@mui/icons-material/AddCircle";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import {
  Apps,
  getBlankTransaction,
  getTransactionError,
  Methods,
  Sources,
  Transaction,
} from "@valuemachine/transactions";
import { getTxIdError } from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

import { SelectOne, TextInput, DateTimeInput } from "../utils";

import { TransferEditor } from "./TransferEditor";

type TransactionEditorProps = {
  tx?: Partial<Transaction>;
  setTx?: (tx: Transaction) => void;
};
export const TransactionEditor: React.FC<TransactionEditorProps> = ({
  tx,
  setTx,
}: TransactionEditorProps) => {
  const [newTx, setNewTx] = useState(getBlankTransaction());
  const [modified, setModified] = useState(false);
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!newTx || !modified || error) return;
    setTx?.(newTx);
  };

  useEffect(() => {
    setError(modified ? getTransactionError(newTx) : "");
  }, [modified, newTx]);

  useEffect(() => {
    if (!tx) return;
    setNewTx(JSON.parse(JSON.stringify({ ...newTx, ...tx })) as Transaction);
  }, [tx]);

  useEffect(() => {
    if (!modified) setError("");
  }, [modified]);

  useEffect(() => {
    if (!newTx) {
      setModified(false);
    } else if (
      newTx?.apps?.length ||
      newTx?.date !== tx?.date ||
      newTx?.index !== tx?.index ||
      newTx?.method !== tx?.method ||
      newTx?.sources?.length ||
      newTx?.transfers?.length ||
      newTx?.uuid !== tx?.uuid
    ) {
      setModified(true);
    } else {
      setModified(false);
    }
  }, [newTx, tx]);

  return (<>
    <Grid
      alignContent="center"
      alignItems="center"
      container
      spacing={1}
      sx={{ p: 1 }}
    >

      <DateTimeInput
        helperText="When did this tx happen?"
        label="Transation DateTime"
        setDateTime={date => setNewTx({ ...newTx, date })}
        dateTime={newTx?.date || ""}
      />

      <Grid item md={2}>
        <SelectOne
          label="App"
          choices={Object.keys(Apps)}
          selection={newTx?.apps?.[0] || ""}
          setSelection={val => setNewTx({ ...newTx, apps: [val] })}
        />
      </Grid>

      <Grid item md={2}>
        <SelectOne
          label="Source"
          choices={Object.keys(Sources)}
          selection={newTx?.sources?.[0] || ""}
          setSelection={val => setNewTx({ ...newTx, sources: [val] })}
        />
      </Grid>

      <Grid item md={4}>
        <SelectOne
          label="Method"
          choices={Object.keys(Methods)}
          selection={newTx?.method || ""}
          setSelection={val => setNewTx({ ...newTx, method: val })}
        />
      </Grid>

      <Grid item md={12}>
        <TextInput 
          label="Transaction ID"
          helperText={"Give this tx a universally unique ID"}
          setText={uuid => setNewTx({ ...newTx, uuid })}
          text={newTx?.uuid || ""}
          getError={getTxIdError}
        />
      </Grid>

      <Grid item md={12}>
        <Typography align="center" variant="h4">
          {`Transfer #1`}
        </Typography>
      </Grid>

      <Grid item md={12}>
        <TransferEditor
          transfer={tx?.transfers?.[0]}
          setTransfer={transfer => setNewTx({ ...newTx, transfers: [transfer] })}
        />
      </Grid>

      <Grid item md={6}>
        <Grid item>
          <Button
            sx={{ mb: 1.5, mx: 2 }}
            color="primary"
            disabled={!modified || !!error}
            onClick={handleSave}
            size="small"
            startIcon={<AddIcon />}
            variant="contained"
          >
            {error || "Save Transaction"}
          </Button>
        </Grid>
      </Grid>

    </Grid>
  </>);
};
