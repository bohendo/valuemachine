import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { TaxYears } from "@valuemachine/taxes";
import { TaxInput } from "@valuemachine/types";
import React, { useEffect, useState } from "react";

import { SelectOne, TextInput } from "../utils";

import { FormsEditor } from "./FormsEditor";

type TaxInputEditorProps = {
  taxInput?: TaxInput;
  setTaxInput?: (val: TaxInput) => void;
};
export const TaxInputEditor: React.FC<TaxInputEditorProps> = ({
  taxInput,
  setTaxInput,
}: TaxInputEditorProps) => {
  const [newTaxInput, setNewTaxInput] = useState({} as any /* initialize form w empty strings */);
  const [error, setError] = useState("");
  const [modified, setModified] = useState(false);

  useEffect(() => {
    if (!taxInput) setNewTaxInput({} as any);
    else setNewTaxInput(JSON.parse(JSON.stringify(taxInput)) as any);
  }, [taxInput]);

  useEffect(() => {
    if (!modified) setError("");
  }, [modified]);

  useEffect(() => {
    if (!taxInput || !newTaxInput) {
      setModified(false);
    } else if (Object.keys(newTaxInput).some(field => newTaxInput[field] !== taxInput[field])) {
      setModified(true);
    } else {
      setModified(false);
    }
  }, [newTaxInput, taxInput]);

  const handleSave = () => {
    console.log("Saving new f1040 form data", newTaxInput);
    setTaxInput?.(newTaxInput);
  };

  return (<>
    <Paper sx={{ p: 3 }}>
      <Grid container spacing={1}>

        <Grid item xs={12}>
          <Typography variant="h4">
            {"Tax & Legal Info"}
          </Typography>
        </Grid>

        <Grid item>
          <SelectOne
            label="Filing Status"
            choices={["Single", "Married Joint", "Married Separate", "Head of Household", "Widow"]}
            selection={
              newTaxInput.Single ? "Single"
              : newTaxInput.MarriedJoint ? "Married Joint"
              : newTaxInput.MarriedSeparate ? "Married Separate"
              : newTaxInput.HeadOfHousehold ? "Head of Household"
              : newTaxInput.Widow ? "Widow"
              : ""
            }
            setSelection={selection => setNewTaxInput({
              ...newTaxInput,
              Single: selection === "Single",
              MarriedJoint: selection === "Married Joint",
              MarriedSeparate: selection === "Married Separate",
              HeadOfHousehold: selection === "Head of Household",
              Widow: selection === "Widow",
            })}
          />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h5">
            {"Personal Info"}
          </Typography>
        </Grid>

        <Grid item>
          <TextInput
            helperText={"First Name"}
            label="First Name"
            setText={FirstName => setNewTaxInput({ ...newTaxInput, FirstName })}
            text={newTaxInput.FirstName}
          />
        </Grid>

        <Grid item>
          <TextInput
            helperText={"Middle Initial"}
            label="Middle Initial"
            setText={MiddleInitial => setNewTaxInput({ ...newTaxInput, MiddleInitial })}
            text={newTaxInput.MiddleInitial}
          />
        </Grid>

        <Grid item>
          <TextInput
            helperText={"Last Name"}
            label="Last Name"
            setText={LastName => setNewTaxInput({ ...newTaxInput, LastName })}
            text={newTaxInput.LastName}
          />
        </Grid>

        <Grid item>
          <TextInput
            helperText={"Social Security Number"}
            label="Social Security Number"
            setText={SSN => setNewTaxInput({
              ...newTaxInput,
              SSN
            })}
            text={newTaxInput.SSN}
          />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h5">
            {"Spouse Info"}
          </Typography>
        </Grid>

        <Grid item>
          <TextInput
            helperText={"Spouse's First Name"}
            label="Spouse First Name"
            setText={SpouseFirstName => setNewTaxInput({ ...newTaxInput, SpouseFirstName })}
            text={newTaxInput.SpouseFirstName}
          />
        </Grid>

        <Grid item>
          <TextInput
            helperText={"Spouse's Middle Initial"}
            label="Spouse Middle Initial"
            setText={SpouseMiddleInitial => setNewTaxInput({ ...newTaxInput, SpouseMiddleInitial })}
            text={newTaxInput.SpouseMiddleInitial}
          />
        </Grid>

        <Grid item>
          <TextInput
            helperText={"Spouse's Last Name"}
            label="Spouse Last Name"
            setText={SpouseLastName => setNewTaxInput({ ...newTaxInput, SpouseLastName })}
            text={newTaxInput.SpouseLastName}
          />
        </Grid>

        <Grid item>
          <TextInput
            helperText={"Spouse's Social Security Number"}
            label="Spouse Social Security Number"
            setText={SpouseSSN => setNewTaxInput({
              ...newTaxInput,
              SpouseSSN,
            })}
            text={newTaxInput.SpouseSSN}
          />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h5">
            {"Domestic Address"}
          </Typography>
        </Grid>

        <Grid item>
          <TextInput
            helperText={"Street Address"}
            label="Street Address"
            setText={StreetAddress => setNewTaxInput({ ...newTaxInput, StreetAddress })}
            text={newTaxInput.StreetAddress}
          />
        </Grid>

        <Grid item>
          <TextInput
            helperText={"Apartment Number"}
            label="Apt"
            setText={Apt => setNewTaxInput({ ...newTaxInput, Apt })}
            text={newTaxInput.Apt}
          />
        </Grid>

        <Grid item>
          <TextInput
            helperText={"City"}
            label="City"
            setText={City => setNewTaxInput({ ...newTaxInput, City })}
            text={newTaxInput.City}
          />
        </Grid>

        <Grid item>
          <TextInput
            helperText={"State"}
            label="State"
            setText={State => setNewTaxInput({ ...newTaxInput, State })}
            text={newTaxInput.State}
          />
        </Grid>

        <Grid item>
          <TextInput
            helperText={"Zip"}
            label="Zip"
            setText={Zip => setNewTaxInput({ ...newTaxInput, Zip })}
            text={newTaxInput.Zip}
          />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h5">
            {"Foreign Address"}
          </Typography>
        </Grid>

        <Grid item>
          <TextInput
            helperText={"Foreign Country Name"}
            label="Foreign Country"
            setText={ForeignCountry => setNewTaxInput({ ...newTaxInput, ForeignCountry })}
            text={newTaxInput.ForeignCountry}
          />
        </Grid>

        <Grid item>
          <TextInput
            helperText={"Foreign State or Province or County"}
            label="Foreign State"
            setText={ForeignState => setNewTaxInput({ ...newTaxInput, ForeignState })}
            text={newTaxInput.ForeignState}
          />
        </Grid>

        <Grid item>
          <TextInput
            helperText={"Foreign Postal Code"}
            label="Foreign Postal Code"
            setText={ForeignZip => setNewTaxInput({ ...newTaxInput, ForeignZip })}
            text={newTaxInput.ForeignZip}
          />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h5">
            {"Financial Info"}
          </Typography>
        </Grid>

        <Grid item>
          <TextInput
            helperText={"Total Income"}
            label="Total Income"
            setText={L1 => setNewTaxInput({ ...newTaxInput, L1 })}
            text={newTaxInput.L1}
          />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h5">
            {`Tax Forms ${TaxYears.USA20}`}
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <FormsEditor
            forms={newTaxInput?.forms || {}}
            setForms={forms => setNewTaxInput({ ...(newTaxInput || {}), forms })}
          />
        </Grid>


        <Grid item xs={12}>
          <Typography>
            {!modified ? "Enter or change tax info" : (error || "Tax input looks good")}
          </Typography>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1, justifyContent: "center" }}>
        <Grid item>
          <Button
            disabled={!modified || !!error}
            onClick={handleSave}
            variant="contained"
          >
            {"Save"}
          </Button>
        </Grid>

      </Grid>
    </Paper>
  </>);
};
