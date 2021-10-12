import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import AddIcon from "@material-ui/icons/AddCircle";
import { Apps, Methods, Sources } from "@valuemachine/transactions";
import { Transaction, TransferCategories } from "@valuemachine/types";
import { getTxIdError, getTransactionError } from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

import { SelectOne, TextInput, TimestampInput } from "../utils";

import { TransferEditor } from "./TransferEditor";

const useStyles = makeStyles((theme: Theme) => createStyles({
  grid: {
    padding: theme.spacing(1),
  },
  button: {
    marginBottom: theme.spacing(1.5),
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
  },
}));

const getEmptyTransaction = (): Transaction => JSON.parse(JSON.stringify({
  apps: [],
  date: "",
  method: Methods.Unknown,
  sources: [],
  transfers: [{
    amount: "",
    asset: "",
    category: TransferCategories.Noop,
    from: "",
    to: "",
  }],
  uuid: "",
}));

type TransactionEditorProps = {
  tx?: Partial<Transaction>;
  setTx?: (tx: Transaction) => void;
};
export const TransactionEditor: React.FC<TransactionEditorProps> = ({
  tx,
  setTx,
}: TransactionEditorProps) => {
  const [newTx, setNewTx] = useState(getEmptyTransaction());
  const [modified, setModified] = useState(false);
  const [error, setError] = useState("");
  const classes = useStyles();

  const handleSave = () => {
    if (!newTx || !modified || error) return;
    setTx?.(newTx);
  };

  useEffect(() => {
    setError(modified ? getTransactionError(newTx) : "");
  }, [modified, newTx]);

  useEffect(() => {
    if (!tx) return;
    setNewTx(JSON.parse(JSON.stringify(tx)) as Transaction);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      className={classes.grid}
      container
      spacing={1}
    >

      <TimestampInput
        helperText="When did this tx happen?"
        label="Transation Timestamp"
        setTimestamp={date => setNewTx({ ...newTx, date })}
        timestamp={newTx?.date}
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
        <TextInput 
          label="Transaction ID"
          helperText={"Give this tx a universally unique ID"}
          setText={uuid => setNewTx({ ...newTx, uuid })}
          text={newTx?.uuid}
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
            className={classes.button}
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
