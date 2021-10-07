import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import AddIcon from "@material-ui/icons/AddCircle";
import { Apps, Methods, Sources } from "@valuemachine/transactions";
import { Transaction, TransferCategories } from "@valuemachine/types";
import { getTxIdError } from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

import { SelectOne } from "./SelectOne";
import { TimestampInput } from "./TimestampInput";
import { TextInput } from "./TextInput";
import { TransferEditor } from "./TransferEditor";

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

const getEmptyTransaction = (): Transaction => ({
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
} as Transaction);

type TransactionEditorProps = {
  tx?: Transaction;
  setTx?: (tx: Transaction) => void;
};
export const TransactionEditor: React.FC<TransactionEditorProps> = ({
  tx,
  setTx,
}: TransactionEditorProps) => {
  const [newTx, setNewTx] = useState(getEmptyTransaction());
  const [txModified, setTxModified] = useState(false);
  const [newTxError, setNewTxError] = useState("");
  const classes = useStyles();

  const getErrors = (candidate: Transaction): string => {
    if (!candidate?.date) {
      return "Date is required";
    } else {
      return "";
    }
  };

  const handleSave = () => {
    if (!newTx || !txModified || newTxError) return;
    setTx?.(newTx);
  };

  useEffect(() => {
    setNewTxError(getErrors(newTx));
  }, [newTx]);

  useEffect(() => {
    if (!tx) return;
    setNewTx(JSON.parse(JSON.stringify(tx)) as Transaction);
  }, [tx]);

  useEffect(() => {
    if (!txModified) {
      setNewTxError("");
    }
  }, [txModified]);

  useEffect(() => {
    if (!newTx) {
      setTxModified(false);
    } else if (
      newTx?.apps?.length ||
      newTx?.date !== tx?.date ||
      newTx?.index !== tx?.index ||
      newTx?.method !== tx?.method ||
      newTx?.sources?.length ||
      newTx?.transfers?.length ||
      newTx?.uuid !== tx?.uuid
    ) {
      setTxModified(true);
    } else {
      setTxModified(false);
    }
  }, [newTx, tx]);

  return (<>
    <Grid
      alignContent="center"
      alignItems="center"
      container
      spacing={1}
      className={classes.grid}
    >

      <TimestampInput
        label="Transation Timestamp"
        setTimestamp={date => setNewTx({ ...newTx, date })}
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
        <TextInput 
          label="Transaction ID"
          helperText={"Give this tx a universally unique ID"}
          setText={uuid => setNewTx({ ...newTx, uuid })}
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
          transfer={newTx?.transfers?.[0]}
          setTransfer={transfer => setNewTx({ ...newTx, transfers: [transfer] })}
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
  </>);
};
