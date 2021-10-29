import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { TaxInput } from "@valuemachine/types";
import React, { useEffect, useState } from "react";

import { SelectOne, TextInput } from "../utils";

type PersonalInfoEditorProps = {
  taxInput?: TaxInput;
  setTaxInput?: (val: TaxInput) => void;
};
export const PersonalInfoEditor: React.FC<PersonalInfoEditorProps> = ({
  taxInput,
  setTaxInput,
}: PersonalInfoEditorProps) => {
  const [newTaxInput, setNewTaxInput] = useState({} as TaxInput);
  const [modified, setModified] = useState(false);

  useEffect(() => {
    if (!taxInput) setNewTaxInput({} as TaxInput);
    else setNewTaxInput(JSON.parse(JSON.stringify(taxInput)) as TaxInput);
  }, [taxInput]);

  useEffect(() => {
    if (!taxInput || !newTaxInput || !newTaxInput.personal) {
      setModified(false);
    } else if (Object.keys(newTaxInput?.personal).some(field => (
      !!newTaxInput.personal?.[field] && !!taxInput?.personal?.[field]
      && newTaxInput.personal?.[field] !== taxInput?.personal?.[field]
    ) || (
      !newTaxInput.personal?.[field] && !!taxInput?.personal?.[field]
    ) || (
      !!newTaxInput.personal?.[field] && !taxInput?.personal?.[field]
    ))) {
      setModified(true);
    } else {
      setModified(false);
    }
  }, [newTaxInput, taxInput]);

  const handleSave = () => {
    console.log("Saving new personal info", newTaxInput);
    setTaxInput?.(newTaxInput);
  };

  const getSetter = (prop: string) => (newVal) => {
    if (!newTaxInput?.personal) return;
    setNewTaxInput({
      ...newTaxInput,
      personal: {
        ...newTaxInput.personal,
        [prop]: newVal,
      },
    });
  };

  return (<>
    <Grid container spacing={1} sx={{ p: 2 }}>

      <Grid item xs={12}>
        <Typography variant="h5">
          {"Personal Info"}
        </Typography>
      </Grid>
      <Grid item xs={12}>
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
      <Grid item>
        <TextInput
          helperText={"First Name"}
          label="First Name"
          setText={getSetter("firstName")}
          text={newTaxInput.personal?.firstName || ""}
        />
      </Grid>
      <Grid item>
        <TextInput
          helperText={"Middle Initial"}
          label="Middle Initial"
          setText={getSetter("middleInitial")}
          text={newTaxInput.personal?.middleInitial || ""}
        />
      </Grid>
      <Grid item>
        <TextInput
          helperText={"Last Name"}
          label="Last Name"
          setText={getSetter("lastName")}
          text={newTaxInput.personal?.lastName || ""}
        />
      </Grid>
      <Grid item>
        <TextInput
          helperText={"Social Security Number"}
          label="Social Security Number"
          setText={getSetter("SSN")}
          text={newTaxInput.personal?.SSN || ""}
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
          setText={getSetter("spouseFirstName")}
          text={newTaxInput.personal?.spouseFirstName || ""}
        />
      </Grid>
      <Grid item>
        <TextInput
          helperText={"Spouse's Middle Initial"}
          label="Spouse Middle Initial"
          setText={getSetter("spouseMiddleInitial")}
          text={newTaxInput.personal?.spouseMiddleInitial || ""}
        />
      </Grid>
      <Grid item>
        <TextInput
          helperText={"Spouse's Last Name"}
          label="Spouse Last Name"
          setText={getSetter("spouseLastName")}
          text={newTaxInput.personal?.spouseLastName || ""}
        />
      </Grid>
      <Grid item>
        <TextInput
          helperText={"Spouse's Social Security Number"}
          label="Spouse Social Security Number"
          setText={getSetter("spouseSSN")}
          text={newTaxInput.personal?.spouseSSN || ""}
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
          setText={getSetter("streetAddress")}
          text={newTaxInput.personal?.streetAddress || ""}
        />
      </Grid>
      <Grid item>
        <TextInput
          helperText={"Apartment Number"}
          label="Apt"
          setText={getSetter("apt")}
          text={newTaxInput.personal?.apt || ""}
        />
      </Grid>
      <Grid item>
        <TextInput
          helperText={"City"}
          label="City"
          setText={getSetter("city")}
          text={newTaxInput.personal?.city || ""}
        />
      </Grid>
      <Grid item>
        <TextInput
          helperText={"State"}
          label="State"
          setText={getSetter("state")}
          text={newTaxInput.personal?.state || ""}
        />
      </Grid>
      <Grid item>
        <TextInput
          helperText={"Zip"}
          label="Zip"
          setText={getSetter("zip")}
          text={newTaxInput.personal?.zip || ""}
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
          setText={getSetter("foreignCountry")}
          text={newTaxInput.personal?.foreignCountry || ""}
        />
      </Grid>
      <Grid item>
        <TextInput
          helperText={"Foreign State or Province or County"}
          label="Foreign State"
          setText={getSetter("foreignState")}
          text={newTaxInput.personal?.foreignState || ""}
        />
      </Grid>
      <Grid item>
        <TextInput
          helperText={"Foreign Postal Code"}
          label="Foreign Postal Code"
          setText={getSetter("foreignZip")}
          text={newTaxInput.personal?.foreignZip || ""}
        />
      </Grid>

      <Grid item xs={12} sx={{ my: 2, textAlign: "center" }}>
        <Button
          disabled={!modified}
          onClick={handleSave}
          variant="contained"
        >
          {"Save"}
        </Button>
      </Grid>

    </Grid>
  </>);
};
