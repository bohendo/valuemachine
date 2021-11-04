import DeleteIcon from "@mui/icons-material/Delete";
import InsertIcon from "@mui/icons-material/AddCircle";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Grid from "@mui/material/Grid";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { IncomeTypes, TxTags, TxTagTypes } from "@valuemachine/types";
import React, { useEffect, useState } from "react";

import { Confirm, SelectOne, TextInput } from "../utils";

type NewTxTag = {
  txId?: string;
  tagType?: string;
  value?: any;
};
type TxTagsEditorProps = {
  txTags?: TxTags;
  setTxTags?: (val: TxTags) => void;
};
export const TxTagsEditor: React.FC<TxTagsEditorProps> = ({
  txTags,
  setTxTags,
}: TxTagsEditorProps) => {
  const [confirmMsg, setConfirmMsg] = useState("");
  const [modified, setModified] = useState(false);
  const [newTxTag, setNewTxTags] = useState({} as NewTxTag);
  const [pendingDel, setPendingDel] = useState({ txId: "", tagType: "" });

  console.log(`newTxTag=${JSON.stringify(newTxTag)}`);

  useEffect(() => {
    if (!txTags || !newTxTag) {
      setModified(false);
    } else if (newTxTag.value !== undefined) {
      setModified(true);
    } else {
      setModified(false);
    }
  }, [newTxTag, txTags]);

  const handleInsert = () => {
    if (!newTxTag.txId || !newTxTag.tagType || !("value" in newTxTag)) return;
    console.log("Saving new tx tag", newTxTag);
    setTxTags?.({
      ...(txTags || {}),
      [newTxTag.txId]: {
        ...(txTags?.[newTxTag.txId] || {}),
        [newTxTag.tagType]: newTxTag.value,
      }
    });
    setNewTxTags({} as NewTxTag);
  };

  const handleDelete = (txId: string, tagType: string) => {
    setPendingDel({ txId, tagType });
    setConfirmMsg(`Are you sure you want to delete ${txId}.${tagType}`);
  };

  const doDelete = () => {
    if (!pendingDel || !pendingDel.txId || !pendingDel.tagType) return;
    const { txId, tagType } = pendingDel;
    if (!txTags || !txTags[txId] || !(tagType in txTags[txId])) return;
    console.log(`Deleting ${txId}.${tagType}`);
    const targetTag = txTags?.[txId] || {};
    delete targetTag[tagType];
    setTxTags?.({
      ...(txTags || {}),
      [txId]: targetTag,
    });
    setPendingDel({ txId: "", tagType: "" });
    setConfirmMsg("");
  };

  return (<>
    <Grid container spacing={1} sx={{ mb: 2, pl: 1 }}>

      <Grid item xs={12}>
        <Typography variant="h4">
          {`Transaction Tags`}
        </Typography>
      </Grid>

      <Grid item sx={{ mt: 3 }}>
        <Button
          disabled={!modified}
          onClick={handleInsert}
          variant="contained"
        >
          <InsertIcon />
        </Button>
      </Grid>

      <Grid item>
        <TextInput
          helperText={"Transaction ID"}
          label="TxId"
          setText={txId => setNewTxTags({ ...newTxTag, txId })}
          text={
            newTxTag.txId?.toString()
            || txTags?.[newTxTag?.txId || ""]?.[newTxTag?.tagType || ""]
            || ""
          }
        />
      </Grid>

      {newTxTag.txId ? (
        <Grid item>
          <SelectOne
            label="Tag Type"
            choices={Object.keys(TxTagTypes)}
            selection={newTxTag.tagType}
            setSelection={tagType => setNewTxTags({ txId: newTxTag.txId, tagType })}
          />
        </Grid>
      ) : null}

      {newTxTag.txId && newTxTag.tagType ? (
        newTxTag.tagType === TxTagTypes.incomeType ? (
          <Grid item>
            <SelectOne
              label="Income Type"
              choices={Object.keys(IncomeTypes)}
              selection={newTxTag.tagType}
              setSelection={tagType => setNewTxTags({ tagType })}
            />
          </Grid>
        ) : (
          <Grid item>
            <TextInput
              helperText={"Tag Value"}
              label="Tag Value"
              setText={value => setNewTxTags({ ...newTxTag, value })}
              text={newTxTag.value?.toString() || txTags?.[newTxTag.txId]?.[newTxTag.tagType] || ""}
            />
          </Grid>
        )
      ) : null}
    </Grid>

    <TableContainer>
      <Table size="small" sx={{ minWidth: "26em", overflow: "auto" }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: "8em" }}><strong> Form </strong></TableCell>
            <TableCell><strong> Field </strong></TableCell>
            <TableCell><strong> Value </strong></TableCell>
            <TableCell sx={{ width: "4em" }}><strong> Delete </strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {!txTags ? null : Object.keys(txTags).reduce((rows: any[], txId: string) => {
            Object.keys(txTags[txId]).forEach(tagType => {
              rows.push(
                <TableRow key={`${txId}_${tagType}`}>
                  <TableCell sx={{ width: "8em" }}> {txId} </TableCell>
                  <TableCell> {tagType} </TableCell>
                  <TableCell> {typeof txTags[txId][tagType] === "boolean" ? (
                    <Checkbox
                      onChange={() => setTxTags?.({
                        ...(txTags || {}),
                        [txId]: {
                          ...txTags[txId],
                          [tagType]: !txTags[txId][tagType],
                        },
                      })}
                      checked={txTags[txId][tagType]}
                      indeterminate={typeof txTags[txId][tagType] !== "boolean"}
                    />
                  ) : (
                    txTags[txId][tagType]
                  )
                  } </TableCell>
                  <TableCell
                    sx={{ width: "4em" }}
                    onClick={() => handleDelete(txId, tagType)}
                  >
                    <DeleteIcon sx={{ ml: 1 }} />
                  </TableCell>
                </TableRow>
              );
            });
            return rows;
          }, [] as any[])}
        </TableBody>
      </Table>
    </TableContainer>

    <Confirm message={confirmMsg} setMessage={setConfirmMsg} action={doDelete} />
  </>);
};

