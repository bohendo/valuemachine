import DeleteIcon from "@mui/icons-material/Delete";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
// import Typography from "@mui/material/Typography";
import { FormArchive, MappingArchive, TaxYears } from "@valuemachine/taxes";
import React, { useEffect, useState } from "react";

import { SelectOne, TextInput } from "../utils";

const taxYear = TaxYears.USA20;
const mappings = MappingArchive[taxYear];

type Forms = FormArchive["USA20"];
type NewForm = { form?: string; field?: string; value?: any; };
type FormsEditorProps = {
  forms?: Forms;
  setForms?: (val: Forms) => void;
};
export const FormsEditor: React.FC<FormsEditorProps> = ({
  forms,
  setForms,
}: FormsEditorProps) => {
  const [newForm, setNewForm] = useState({} as NewForm);
  const [error, setError] = useState("");
  const [modified, setModified] = useState(false);

  console.log(`Rendering new form: ${JSON.stringify(newForm)}`);

  useEffect(() => {
    if (!modified) setError("");
  }, [modified]);

  useEffect(() => {
    if (!forms || !newForm) {
      setModified(false);
    } else if (newForm.value !== undefined) {
      setModified(true);
    } else {
      setModified(false);
    }
  }, [newForm, forms]);

  const handleInsert = () => {
    if (!newForm.form || !newForm.field || !newForm.value) return;
    console.log("Saving new form data", newForm);
    setForms?.({
      ...(forms || {}),
      [newForm.form]: {
        ...(forms?.[newForm.form] || {}),
        [newForm.field]: newForm.value,
      }
    });
    setNewForm({} as NewForm);
  };

  const handleDelete = (form, field) => {
    if (!forms || !forms[form] || !forms[form][field]) return;
    setForms?.({
      ...(forms || {}),
      [form]: {
        ...(forms?.[form] || {}),
        [field]: undefined,
      }
    });
  };

  return (<>
    <Paper sx={{ p: 3 }}>
      <Grid container spacing={1}>

        <Grid item sx={{ mt: 3 }}>
          <Button
            disabled={!modified || !!error}
            onClick={handleInsert}
            variant="contained"
          >
            {"Save"}
          </Button>
        </Grid>

        <Grid item>
          <SelectOne
            label="Form"
            choices={Object.keys(mappings)}
            selection={newForm.form}
            setSelection={form => setNewForm({ form })}
          />
        </Grid>

        {newForm.form ? (
          <Grid item>
            <SelectOne
              label="Field"
              choices={mappings[newForm.form].map(e => e.nickname)}
              selection={newForm.field}
              setSelection={field => setNewForm({ form: newForm.form, field })}
            />
          </Grid>
        ) : null}

        {newForm.form && newForm.field ? (
          mappings[newForm.form].find(e => e.nickname === newForm.field)?.checkmark ? (
            <Grid item>
              <SelectOne
                label={newForm.field}
                choices={["Checked", "Unchecked"]}
                selection={newForm.value ? "Checked" : "Unchecked"}
                setSelection={value => setNewForm({ ...newForm, value: value === "Checked" ? true : false })}
              />
            </Grid>
          ) : (
            <Grid item>
              <TextInput
                helperText={"Value"}
                label="Value"
                setText={value => setNewForm({ ...newForm, value })}
                text={newForm.value?.toString() || ""}
              />
            </Grid>
          )
        ) : null}

      </Grid>

      <TableContainer>
        <Table size="small" sx={{ minWidth: "26em", overflow: "auto" }}>
          <TableHead>
            <TableRow>
              <TableCell><strong> Form </strong></TableCell>
              <TableCell><strong> Field </strong></TableCell>
              <TableCell><strong> Value </strong></TableCell>
              <TableCell><strong> Delete </strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!forms ? null : Object.keys(forms).reduce((rows: any[], form: string) => {
              Object.keys(forms[form]).forEach(field => {
                rows.push(
                  <TableRow key={`${form}_${field}`}>
                    <TableCell> {form} </TableCell>
                    <TableCell> {field} </TableCell>
                    <TableCell> {forms[form][field]} </TableCell>
                    <TableCell
                      onClick={() => handleDelete(form, field)}
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

    </Paper>
  </>);
};
