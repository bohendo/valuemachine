import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import {
  Transfer,
  TransferCategories,
  getTransferError,
} from "@valuemachine/transactions";
import {
  getAccountError,
  getAmountError,
  getAssetError,
} from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

import { SelectOne, TextInput } from "../utils";

const getEmptyTransfer = (): Transfer => JSON.parse(JSON.stringify({
  amount: "",
  asset: "",
  category: TransferCategories.Noop,
  from: "",
  to: "",
}));

type TransferEditorProps = {
  transfer?: Transfer;
  setTransfer?: (transfer: Transfer) => void;
};
export const TransferEditor: React.FC<TransferEditorProps> = ({
  transfer,
  setTransfer,
}: TransferEditorProps) => {
  const [newTransfer, setNewTransfer] = useState(getEmptyTransfer());
  const [error, setError] = useState("");
  const [modified, setModified] = useState(false);

  useEffect(() => {
    if (!newTransfer || !modified || error) return;
    setTransfer?.(newTransfer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newTransfer, modified, error]);

  useEffect(() => {
    if (!transfer) setNewTransfer(getEmptyTransfer());
    else setNewTransfer(JSON.parse(JSON.stringify(transfer)) as Transfer);
  }, [transfer]);

  useEffect(() => {
    setError(newTransfer ? getTransferError(newTransfer) : "");
    if (!error) setTransfer?.(newTransfer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newTransfer]);

  useEffect(() => {
    if (!modified) setError("");
  }, [modified]);

  useEffect(() => {
    if (!transfer || !newTransfer) {
      setModified(false);
    } else if (
      newTransfer?.amount !== transfer?.amount ||
      newTransfer?.asset !== transfer?.asset ||
      newTransfer?.category !== transfer?.category ||
      newTransfer?.from !== transfer?.from ||
      newTransfer?.to !== transfer?.to
    ) {
      setModified(true);
    } else {
      setModified(false);
    }
  }, [newTransfer, transfer]);

  return (<>
    <Grid
      alignContent="center"
      alignItems="center"
      container
      spacing={1}
      sx={{ m: 1 }}
    >

      <Grid item md={4}>
        <TextInput 
          getError={getAssetError}
          helperText={"Which type of asset was transferred?"}
          label="Asset"
          setText={asset => setNewTransfer({ ...newTransfer, asset })}
          text={newTransfer.asset}
        />
      </Grid>

      <Grid item md={4}>
        <TextInput 
          getError={getAmountError}
          helperText={"How much is this tx transferring"}
          label="Amount"
          setText={amount => setNewTransfer({ ...newTransfer, amount })}
          text={newTransfer.amount}
        />
      </Grid>

      <Grid item md={4}>
        <SelectOne 
          label="Category"
          choices={Object.keys(TransferCategories)}
          selection={newTransfer.category}
          setSelection={category => setNewTransfer({
            ...newTransfer,
            category: TransferCategories[category],
          })}
        />
      </Grid>

      <Grid item md={4}>
        <TextInput 
          getError={getAccountError}
          helperText={"Who received the transfer"}
          label="To"
          setText={to => setNewTransfer({ ...newTransfer, to })}
          text={newTransfer.to}
        />
      </Grid>

      <Grid item md={4}>
        <TextInput 
          getError={getAccountError}
          helperText={"Who sent the transfer"}
          label="From"
          setText={from => setNewTransfer({ ...newTransfer, from })}
          text={newTransfer.from}
        />
      </Grid>



      <Grid item md={6}>
        <Typography>
          {!modified ? "Enter transfer info" : (error || "Transfer looks good")}
        </Typography>
      </Grid>

    </Grid>
  </>);
};
