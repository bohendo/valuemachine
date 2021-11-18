import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { TaxInput } from "@valuemachine/types";
import React, { useEffect, useState } from "react";

import { TextInput } from "../../utils";

type BusinessInfoEditorProps = {
  taxInput?: TaxInput;
  setTaxInput?: (val: TaxInput) => void;
};
export const BusinessInfoEditor: React.FC<BusinessInfoEditorProps> = ({
  taxInput,
  setTaxInput,
}: BusinessInfoEditorProps) => {
  const [newTaxInput, setNewTaxInput] = useState({} as any /* initialize form w empty strings */);
  const [modified, setModified] = useState(false);

  useEffect(() => {
    if (!taxInput) {
      setNewTaxInput({ business: {} } as TaxInput);
    } else{
      setNewTaxInput(JSON.parse(JSON.stringify({
        ...taxInput,
        business: { ...(taxInput.business || {}) },
      })) as TaxInput);
    }
  }, [taxInput]);

  useEffect(() => {
    if (!taxInput || !newTaxInput || !newTaxInput.business) {
      setModified(false);
    } else if (Object.keys(newTaxInput?.business).some(field => (
      !!newTaxInput.business?.[field] && !!taxInput?.business?.[field]
      && newTaxInput.business?.[field] !== taxInput?.business?.[field]
    ) || (
      !newTaxInput.business?.[field] && !!taxInput?.business?.[field]
    ) || (
      !!newTaxInput.business?.[field] && !taxInput?.business?.[field]
    ))) {
      setModified(true);
    } else {
      setModified(false);
    }
  }, [newTaxInput, taxInput]);

  const handleSave = () => {
    console.log("Saving new business info", newTaxInput.business);
    setTaxInput?.(newTaxInput);
  };

  const getSetter = (prop: string) => (newVal) => {
    if (!newTaxInput?.business) return;
    setNewTaxInput({
      ...newTaxInput,
      business: {
        ...newTaxInput.business,
        [prop]: newVal,
      },
    });
  };

  return (<>
    <Grid container spacing={1} sx={{ p: 2 }}>

      <Grid item xs={12}>
        <Typography variant="h4">
          {"Business Info"}
        </Typography>
      </Grid>

      <Grid item>
        <TextInput
          helperText={"Business Name"}
          label="Business Name"
          setText={getSetter("name")}
          text={newTaxInput.business?.name || ""}
        />
      </Grid>

      <Grid item>
        <TextInput
          helperText={"Business Industry"}
          label="Business Industry"
          setText={getSetter("industry")}
          text={newTaxInput.business?.industry || ""}
        />
      </Grid>

      <Grid item>
        <TextInput
          helperText={"Street Address"}
          label="Business Address"
          setText={getSetter("street")}
          text={newTaxInput.business?.street || ""}
        />
      </Grid>

      <Grid item>
        <TextInput
          helperText={"City"}
          label="City"
          setText={getSetter("city")}
          text={newTaxInput.business?.city || ""}
        />
      </Grid>

      <Grid item>
        <TextInput
          helperText={"State"}
          label="State"
          setText={getSetter("state")}
          text={newTaxInput.business?.state || ""}
        />
      </Grid>

      <Grid item>
        <TextInput
          helperText={"Zip"}
          label="Zip"
          setText={getSetter("zip")}
          text={newTaxInput.business?.zip || ""}
        />
      </Grid>

      <Grid item>
        <TextInput
          helperText={"See f1040sc instructions"}
          label="Code"
          setText={getSetter("code")}
          text={newTaxInput.business?.code || ""}
        />
      </Grid>

      <Grid item>
        <TextInput
          helperText={"idk"}
          label="EID"
          setText={getSetter("eid")}
          text={newTaxInput.business?.eid || ""}
        />
      </Grid>

      <Grid item>
        <TextInput
          helperText={"Cash or Accrual or Other"}
          label="Accounting Method"
          setText={getSetter("accountingMethod")}
          text={newTaxInput.business?.accountingMethod || ""}
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
