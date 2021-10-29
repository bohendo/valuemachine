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
import Typography from "@mui/material/Typography";
import { DateString, DecString, TaxInput } from "@valuemachine/types";
import React, { useEffect, useState } from "react";

import { DateInput, TextInput } from "../utils";

type Trip = {
  enterDate?: DateString;
  leaveDate?: DateString;
  country?: string;
  usaIncomeEarned?: DecString;
};
type TravelHistoryEditorProps = {
  taxInput?: TaxInput;
  setTaxInput?: (val: TaxInput) => void;
};
export const TravelHistoryEditor: React.FC<TravelHistoryEditorProps> = ({
  taxInput,
  setTaxInput,
}: TravelHistoryEditorProps) => {
  const [newTrip, setNewTrip] = useState({} as Trip);
  const [insertable, setInsertable] = useState(false);

  useEffect(() => {
    if (!newTrip) {
      setInsertable(false);
    } else if (
      newTrip.enterDate && newTrip.leaveDate && newTrip.country
    ) {
      setInsertable(true);
    } else {
      setInsertable(false);
    }
  }, [newTrip, taxInput]);

  const handleInsert = () => {
    if (!newTrip || !newTrip.enterDate || !newTrip.leaveDate || !newTrip.country) return;
    setTaxInput?.({
      ...(taxInput || {}),
      travel: [
        ...(taxInput?.travel || []),
        {
          enterDate: newTrip.enterDate || "",
          leaveDate: newTrip.leaveDate || "",
          country: newTrip.country || "",
          usaIncomeEarned: newTrip.usaIncomeEarned || "0",
        },
      ],
    });
    setNewTrip({} as Trip);
  };

  const handleDelete = (index: number) => {
    if (!taxInput?.travel) return;
    const newTravel = [...taxInput.travel];
    newTravel.splice(index, 1);
    setTaxInput?.({
      ...taxInput,
      travel: newTravel,
    });
  };

  const getSetter = (prop: string) => (newVal) => {
    if (!prop) return;
    setNewTrip({ ...(newTrip || {}), [prop]: newVal });
  };

  return (<>
    <Grid container spacing={1} sx={{ p: 2 }}>

      <Grid item xs={12}>
        <Typography variant="h4">
          {"Travel History"}
        </Typography>
      </Grid>

      <Grid item>
        <TextInput
          helperText={"Country"}
          label="Country"
          setText={getSetter("country")}
          text={newTrip?.country || ""}
        />
      </Grid>

      <Grid item>
        <TextInput
          helperText={"USD earned while in this country"}
          label="USA Income Earned"
          setText={getSetter("usaIncomeEarned")}
          text={newTrip?.usaIncomeEarned || ""}
        />
      </Grid>

      <Grid item>
        <DateInput
          label="Enter Date"
          setDate={getSetter("enterDate")}
          date={newTrip?.enterDate || ""}
        />
      </Grid>

      <Grid item>
        <DateInput
          label="Leave Date"
          setDate={getSetter("leaveDate")}
          date={newTrip?.leaveDate || ""}
        />
      </Grid>

      <Grid item xs={12} sx={{ my: 2, textAlign: "center" }}>
        <Button
          disabled={!insertable}
          onClick={handleInsert}
          variant="contained"
        >
          <InsertIcon />
        </Button>
      </Grid>

    </Grid>

    <TableContainer sx={{ mb: 3 }}>
      <Table size="small" sx={{ minWidth: "26em", overflow: "auto" }}>
        <TableHead>
          <TableRow>
            <TableCell><strong> Country </strong></TableCell>
            <TableCell><strong> Enter Date </strong></TableCell>
            <TableCell><strong> Leave Date </strong></TableCell>
            <TableCell><strong> USA Income Earned </strong></TableCell>
            <TableCell sx={{ width: "4em" }}><strong> Delete </strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(!taxInput || !taxInput.travel)
            ? null
            : taxInput.travel.map((trip: Trip, index: number) => (
              <TableRow key={index}>
                <TableCell> {trip.country} </TableCell>
                <TableCell> {trip.enterDate} </TableCell>
                <TableCell> {trip.leaveDate} </TableCell>
                <TableCell> {trip.usaIncomeEarned} </TableCell>
                <TableCell
                  sx={{ width: "4em" }}
                  onClick={() => handleDelete(index)}
                >
                  <DeleteIcon sx={{ ml: 1 }} />
                </TableCell>
              </TableRow>
            ))
          }
        </TableBody>
      </Table>
    </TableContainer>

  </>);
};
