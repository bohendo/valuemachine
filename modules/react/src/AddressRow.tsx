import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Box from "@material-ui/core/Box";
import Button from "@material-ui/core/Button";
import Collapse from "@material-ui/core/Collapse";
import Grid from "@material-ui/core/Grid";
import IconButton from "@material-ui/core/IconButton";
import TableCell from "@material-ui/core/TableCell";
import TableRow from "@material-ui/core/TableRow";
import Typography from "@material-ui/core/Typography";
import RemoveIcon from "@material-ui/icons/Delete";
import EditIcon from "@material-ui/icons/Edit";
import {
  AddressEntry,
} from "@valuemachine/types";
import React, { useState } from "react";

import { AddressEditor } from "./AddressEditor";

const useStyles = makeStyles((theme: Theme) => createStyles({
  tableRow: {
    "& > *": {
      borderBottom: "unset",
      margin: theme.spacing(0),
    },
    overflow: "auto",
  },
  innerBox: {
    maxWidth: theme.spacing(160),
    overflow: "auto",
  },
  button: {
    marginBottom: theme.spacing(1.5),
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
  },
}));

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
  const classes = useStyles();

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
      <TableRow className={classes.tableRow}>
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
            <Box py={2} px={4} className={classes.innerBox}>
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
                  className={classes.button}
                  color="primary"
                  onClick={handleDelete}
                  size="small"
                  startIcon={<RemoveIcon />}
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
