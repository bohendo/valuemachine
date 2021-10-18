import RemoveIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import {
  AddressEntry,
} from "@valuemachine/types";
import React, { useState } from "react";

import { AddressEditor } from "./AddressEditor";

type AddressRowProps = {
  editEntry: (s: string, e?: AddressEntry) => void;
  entry: AddressEntry;
  otherAddresses: string[];
};
export const AddressRow: React.FC<AddressRowProps> = ({
  editEntry,
  entry,
  otherAddresses,
}: AddressRowProps) => {
  const [editMode, setEditMode] = useState(false);
  const [newEntry, setNewEntry] = useState({} as Partial<AddressEntry>);

  const toggleEditMode = () => {
    setEditMode(!editMode);
    if (editMode) {
      setNewEntry({});
    } else {
      setNewEntry(JSON.parse(JSON.stringify(entry)));
    }
  };

  const handleDelete = () => {
    editEntry(entry.address);
    setEditMode(false);
  };

  const handleEdit = (editedEntry) => {
    editEntry(entry.address, editedEntry);
    setEditMode(false);
  };

  return (
    <React.Fragment>
      <TableRow sx={{ m: 0, overflow: "auto", ["&>td"]: { borderBottom: 0 } }}>
        <TableCell> {entry.name} </TableCell>
        <TableCell> {entry.category} </TableCell>
        <TableCell><pre> {entry.address} </pre></TableCell>
        <TableCell>
          <IconButton color="secondary" onClick={toggleEditMode}>
            <EditIcon />
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={editMode} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 4, maxWidth: "120em", overflow: "auto" }}>
              <Typography variant="h6" gutterBottom component="div">
                Edit Address
              </Typography>

              <AddressEditor
                entry={newEntry}
                setEntry={handleEdit}
                addresses={otherAddresses}
              />

              <Grid item>
                <Button
                  color="primary"
                  onClick={handleDelete}
                  size="small"
                  startIcon={<RemoveIcon />}
                  sx={{ mb: 1.5, mx: 2 }}
                  variant="contained"
                >
                  Delete Address
                </Button>
              </Grid>

            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
};
