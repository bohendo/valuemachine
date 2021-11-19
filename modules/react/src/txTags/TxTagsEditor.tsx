import DeleteIcon from "@mui/icons-material/Delete";
import InsertIcon from "@mui/icons-material/AddCircle";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { PhysicalGuards, Guards } from "@valuemachine/transactions";
import { ExpenseTypes, IncomeTypes, TxId, TxTags, TxTagTypes } from "@valuemachine/types";
import { dedup, getDecStringError, getTxIdError } from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

import { Confirm, HexString, SelectOne, TextInput } from "../utils";

type NewTxTag = {
  txId?: string;
  tagType?: string;
  value?: any;
};
type TxTagsEditorProps = {
  setTxTags?: (val: TxTags) => void;
  txId?: TxId;
  txTags?: TxTags;
};
export const TxTagsEditor: React.FC<TxTagsEditorProps> = ({
  setTxTags,
  txId,
  txTags,
}: TxTagsEditorProps) => {
  const [confirmMsg, setConfirmMsg] = useState("");
  const [modified, setModified] = useState(false);
  const [newTxTag, setNewTxTag] = useState({} as NewTxTag);
  const [txTagDisplay, setTxTagDisplay] = useState({} as TxTags);
  const [pendingDel, setPendingDel] = useState({ txId: "", tagType: "" });

  useEffect(() => {
    setTxTagDisplay(!txId ? (
      txTags || {}
    ) : (
      Object.keys(txTags || {}).reduce(
        (tag: TxTags, id: string): TxTags => id === txId
          ? ({ ...tag, [txId]: (txTags?.[txId] || {}) })
          : tag,
        {} as TxTags,
      )
    ));
    if (!txId) return;
    setNewTxTag({ ...newTxTag, txId });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txId, txTags]);

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
    const newTxTags = {
      ...(txTags || {}),
      [newTxTag.txId]: {
        ...(txTags?.[newTxTag.txId] || {}),
        [newTxTag.tagType]: newTxTag.value,
      }
    };
    console.log(`Saving new ${newTxTag.txId}.${newTxTag.tagType}=${newTxTag.value}`, newTxTags);
    setTxTags?.(newTxTags);
    setNewTxTag({ txId } as NewTxTag);
  };

  const handleDelete = (txId: string, tagType: string) => {
    setPendingDel({ txId, tagType });
    setConfirmMsg(`Are you sure you want to delete ${txId}.${tagType}`);
  };

  const doDelete = () => {
    if (!pendingDel || !pendingDel.txId || !pendingDel.tagType) return;
    const { txId: id, tagType } = pendingDel;
    if (!txTags || !txTags[id] || !(tagType in txTags[id])) return;

    const targetTag = txTags?.[id] || {};
    delete targetTag[tagType];
    const newTxTags = {
      ...(txTags || {}),
      [id]: targetTag,
    };
    console.log(`Saving deleted ${id}.${tagType}`, newTxTags);
    setTxTags?.(newTxTags);
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
            setText={newTxId => setNewTxTag({ ...newTxTag, txId: newTxId })}
            text={
              newTxTag.txId?.toString()
              || txTags?.[newTxTag?.txId || ""]?.[newTxTag?.tagType || ""]
              || ""
            }
          />
        )}
      </Grid>

      {newTxTag.txId ? (
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
              selection={newTxTag.value?.toString() || txTags?.[newTxTag.txId]?.[newTxTag.tagType] || ""}
              setSelection={incomeType => setNewTxTag({ ...newTxTag, value: incomeType })}
            />
          </Grid>
        ) : newTxTag.tagType === TxTagTypes.expenseType ? (
          <Grid item>
            <SelectOne
              label="Expense Type"
              choices={Object.keys(ExpenseTypes)}
              selection={newTxTag.value?.toString() || txTags?.[newTxTag.txId]?.[newTxTag.tagType] || ""}
              setSelection={expenseType => setNewTxTag({ ...newTxTag, value: expenseType })}
            />
          </Grid>
        ) : newTxTag.tagType === TxTagTypes.physicalGuard ? (
          <Grid item>
            <SelectOne
              label="Physical Guard"
              choices={dedup([Guards.IDK, ...Object.keys(PhysicalGuards)])}
              selection={newTxTag.value?.toString() || txTags?.[newTxTag.txId]?.[newTxTag.tagType] || ""}
              setSelection={physicalGuard => setNewTxTag({ ...newTxTag, value: physicalGuard })}
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
      <Table size="small" sx={{ minWidth: "16em", overflow: "auto" }}>
        <TableHead>
          <TableRow>
            {!txId ? (
              <TableCell><strong> TxId </strong></TableCell>
            ) : null}
            <TableCell><strong> Tag Type </strong></TableCell>
            <TableCell><strong> Tag Value </strong></TableCell>
            <TableCell sx={{ width: "4em" }}><strong> Delete </strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {!txTagDisplay ? null : Object.keys(txTagDisplay).reduce((rows: any[], id: string) => {
            Object.keys(txTagDisplay[id]).forEach(tagType => {
              rows.push(
                <TableRow key={`${id}_${tagType}`}>
                  {!txId ? (
                    <TableCell> <HexString value={id} /> </TableCell>
                  ) : null}
                  <TableCell> {tagType} </TableCell>
                  <TableCell> {txTagDisplay[id][tagType]} </TableCell>
                  <TableCell
                    sx={{ width: "4em" }}
                    onClick={() => handleDelete(id, tagType)}
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

