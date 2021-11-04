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
//import Typography from "@mui/material/Typography";
import { IncomeTypes, TxId, TxTags, TxTagTypes } from "@valuemachine/types";
import { getDecStringError, getTxIdError } from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

import { Confirm, HexString, SelectOne, TextInput } from "../utils";

type NewTxTag = {
  txId?: string;
  tagType?: string;
  value?: any;
};
type TxTagsEditorProps = {
  txTags?: TxTags;
  setTxTags?: (val: TxTags) => void;
  txId?: TxId;
};
export const TxTagsEditor: React.FC<TxTagsEditorProps> = ({
  txTags,
  setTxTags,
  txId,
}: TxTagsEditorProps) => {
  const [confirmMsg, setConfirmMsg] = useState("");
  const [modified, setModified] = useState(false);
  const [newTxTag, setNewTxTag] = useState({} as NewTxTag);
  const [txTagDisplay, setTxTagDisplay] = useState({} as NewTxTag);
  const [pendingDel, setPendingDel] = useState({ txId: "", tagType: "" });

  console.log(`newTxTag=${JSON.stringify(newTxTag)}`);

  useEffect(() => {
    setTxTagDisplay(!txId ? txTags : Object.keys(txTags || {}).reduce((tags, id) => {
      return id === txId ? { ...tags, [txId]: txTags?.[txId] } : tags;
    }, {} as TxTags));
    if (!txId) return;
    setNewTxTag({ ...newTxTag, txId });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txId]);

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
    setNewTxTag({} as NewTxTag);
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
    <Grid container spacing={1} sx={{ p: 2 }}>

      <Grid item sx={{ mt: 3 }}>
        <Button
          disabled={!modified}
          onClick={handleInsert}
          variant="contained"
        >
          <InsertIcon />
        </Button>
      </Grid>

      <Grid item sx={{ alignItems: "center" }}>
        {txId ? (
          <HexString value={txId} sx={{ mt: 4, ml: 2 }} />
        ) : (
          <TextInput
            getError={getTxIdError}
            helperText={"Transaction ID"}
            label="TxId"
            setText={txId => setNewTxTag({ ...newTxTag, txId })}
            text={
              newTxTag.txId?.toString()
              || txTags?.[newTxTag?.txId || ""]?.[newTxTag?.tagType || ""]
              || ""
            }
          />
        )}
      </Grid>

      {(newTxTag.txId || txId) ? (
        <Grid item>
          <SelectOne
            label="Tag Type"
            choices={Object.keys(TxTagTypes)}
            selection={newTxTag.tagType}
            setSelection={tagType => setNewTxTag({ txId: newTxTag.txId, tagType })}
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
              setSelection={incomeType => setNewTxTag({ ...newTxTag, value: incomeType })}
            />
          </Grid>
        ) : (
          <Grid item>
            <TextInput
              getError={newTxTag.tagType === TxTagTypes.multiplier ? getDecStringError : undefined}
              helperText={"Tag Value"}
              label="Tag Value"
              setText={value => setNewTxTag({ ...newTxTag, value })}
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
            <TableCell><strong> TxId </strong></TableCell>
            <TableCell><strong> Tag Type </strong></TableCell>
            <TableCell><strong> Tag Value </strong></TableCell>
            <TableCell sx={{ width: "4em" }}><strong> Delete </strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {!txTagDisplay ? null : Object.keys(txTagDisplay).reduce((rows: any[], txId: string) => {
            Object.keys(txTagDisplay[txId]).forEach(tagType => {
              rows.push(
                <TableRow key={`${txId}_${tagType}`}>
                  <TableCell> <HexString value={txId} /> </TableCell>
                  <TableCell> {tagType} </TableCell>
                  <TableCell> {typeof txTagDisplay[txId][tagType] === "boolean" ? (
                    <Checkbox
                      onChange={() => setTxTags?.({
                        ...(txTagDisplay || {}),
                        [txId]: {
                          ...txTagDisplay[txId],
                          [tagType]: !txTagDisplay[txId][tagType],
                        },
                      })}
                      checked={txTagDisplay[txId][tagType]}
                      indeterminate={typeof txTagDisplay[txId][tagType] !== "boolean"}
                    />
                  ) : (
                    txTagDisplay[txId][tagType]
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

