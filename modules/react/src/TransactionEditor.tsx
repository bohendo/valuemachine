import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import TextField from "@material-ui/core/TextField";
import AddIcon from "@material-ui/icons/AddCircle";
import { Apps, Methods, Sources } from "@valuemachine/transactions";
import { Transaction } from "@valuemachine/types";
import React, { useEffect, useState } from "react";

import { SelectOne } from "./SelectOne";
import { DateInput } from "./DateInput";

const useStyles = makeStyles((theme: Theme) => createStyles({
  grid: {
    margin: theme.spacing(1),
  },
  textInput: {
    margin: theme.spacing(1),
  },
  button: {
    marginBottom: theme.spacing(1.5),
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
  },
}));

type TransactionEditorProps = {
  tx: Partial<Transaction>;
  setTx: (tx: Transaction) => void;
};
export const TransactionEditor: React.FC<TransactionEditorProps> = ({
  tx,
  setTx,
}: TransactionEditorProps) => {
  const [newTx, setNewTx] = useState({} as Partial<Transaction>);
  const [txModified, setTxModified] = useState(false);
  const [newTxError, setNewTxError] = useState("");
  const classes = useStyles();

  const getErrors = (candidate: Partial<Transaction>): string => {
    if (!candidate?.date) {
      return "Date is required";
    } else {
      return "";
    }
  };

  const handleTxChange = (event: React.ChangeEvent<{ name?: string; value: unknown; }>) => {
    const { name, value } = event.target;
    if (typeof name !== "string" || typeof value !== "string") return;
    const newNewTx = { ...newTx, [name]: value };
    setNewTx(newNewTx);
    setNewTxError(getErrors(newNewTx));
  };

  const handleSave = () => {
    if (!newTx) return;
    const errors = getErrors(newTx);
    if (!errors) {
      setTx(newTx as Transaction);
    } else {
      setNewTxError(errors);
    }
  };

  useEffect(() => {
    if (!tx) return;
    setNewTx(JSON.parse(JSON.stringify(tx)));
  }, [tx]);

  useEffect(() => {
    if (!txModified) {
      setNewTxError("");
    }
  }, [txModified]);

  useEffect(() => {
    if (!tx || !newTx) {
      setTxModified(false);
    } else if (
      newTx?.apps?.length ||
      newTx?.date !== tx.date ||
      newTx?.index !== tx.index ||
      newTx?.method !== tx.method ||
      newTx?.sources?.length ||
      newTx?.transfers?.length ||
      newTx?.uuid !== tx.uuid
    ) {
      setTxModified(true);
    } else {
      setTxModified(false);
    }
  }, [newTx, tx]);

  return (
    <Grid
      alignContent="center"
      alignItems="center"
      container
      spacing={1}
      className={classes.grid}
    >

      <DateInput
        id="filter-end-date"
        label="Transation Date"
        setDate={date => setNewTx({ ...newTx, date })}
        helperText="When did this tx happen?"
      />

      <Grid item md={2}>
        <SelectOne
          label="App"
          choices={Object.keys(Apps)}
          selection={newTx?.apps?.[0]}
          setSelection={val => setNewTx({ ...newTx, apps: [val] })}
        />
      </Grid>

      <Grid item md={2}>
        <SelectOne
          label="Source"
          choices={Object.keys(Sources)}
          selection={newTx?.sources?.[0]}
          setSelection={val => setNewTx({ ...newTx, sources: [val] })}
        />
      </Grid>

      <Grid item md={4}>
        <SelectOne
          label="Method"
          choices={Object.keys(Methods)}
          selection={newTx?.method}
          setSelection={val => setNewTx({ ...newTx, method: val })}
        />
      </Grid>

      <Grid item md={12}>
        <TextField
          className={classes.textInput}
          autoComplete="off"
          value={newTx?.uuid || ""}
          error={!!newTxError}
          helperText={newTxError || "Give this tx a universally unique ID"}
          id="uuid"
          fullWidth
          label="Transaction ID"
          margin="normal"
          name="uuid"
          onChange={handleTxChange}
          variant="outlined"
        />
      </Grid>

      <Grid item md={4}>
        <TextField
          className={classes.textInput}
          autoComplete="off"
          value={newTx?.uuid || ""}
          error={!!newTxError}
          helperText={newTxError || "transfer 1 amount"}
          id="uuid"
          fullWidth
          label="Transfer 1 amount"
          margin="normal"
          name="uuid"
          onChange={handleTxChange}
          variant="outlined"
        />
      </Grid>

      <Grid item md={6}>
        {txModified ?
          <Grid item>
            <Button
              className={classes.button}
              color="primary"
              onClick={handleSave}
              size="small"
              startIcon={<AddIcon />}
              variant="contained"
            >
              Save Transaction
            </Button>
          </Grid>
          : undefined
        }
      </Grid>
    </Grid>
  );
};
