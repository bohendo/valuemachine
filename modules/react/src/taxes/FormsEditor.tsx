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
  const [modified, setModified] = useState(false);

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
    if (!newForm.form || !newForm.field || !("form" in newForm)) return;
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
    const targetForm = forms?.[form] || {};
    delete targetForm[field];
    setForms?.({
      ...(forms || {}),
      [form]: targetForm,
    });
  };

  return (<>
    <Grid container spacing={1} sx={{ mb: 2, pl: 1 }}>

      <Grid item xs={12}>
        <Typography variant="h4">
          {`${taxYear} Tax Forms`}
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
            <Checkbox
              size="medium"
              indeterminate={!("value" in newForm)}
              onChange={() => setNewForm({ ...newForm, value: !newForm.value })}
              sx={{ mt: 3 }}
              checked={!!newForm.value}
            />
          </Grid>
        ) : (
          <Grid item>
            <TextInput
              helperText={"Value"}
              label="Value"
              setText={value => setNewForm({ ...newForm, value })}
              text={newForm.value?.toString() || forms?.[newForm.form]?.[newForm.field] || ""}
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
          {!forms ? null : Object.keys(forms).reduce((rows: any[], form: string) => {
            Object.keys(forms[form]).forEach(field => {
              rows.push(
                <TableRow key={`${form}_${field}`}>
                  <TableCell sx={{ width: "8em" }}> {form} </TableCell>
                  <TableCell> {field} </TableCell>
                  <TableCell> {typeof forms[form][field] === "boolean" ? (
                    <Checkbox
                      onChange={() => setForms?.({
                        ...(forms || {}),
                        [form]: {
                          ...forms[form],
                          [field]: !forms[form][field],
                        },
                      })}
                      checked={forms[form][field]}
                      indeterminate={typeof forms[form][field] !== "boolean"}
                    />
                  ) : (
                    forms[form][field]
                  )
                  } </TableCell>
                  <TableCell
                    sx={{ width: "4em" }}
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

  </>);
};
