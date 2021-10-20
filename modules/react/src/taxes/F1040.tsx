import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { Forms } from "@valuemachine/taxes";
import React, { useEffect, useState } from "react";

import { SelectOne, TextInput } from "../utils";

type F1040Props = {
  formData?: Partial<Forms["f1040"]>;
  setFormData?: (val: Partial<Forms["f1040"]>) => void;
};
export const F1040: React.FC<F1040Props> = ({
  formData,
  setFormData,
}: F1040Props) => {
  const [newFormData, setNewFormData] = useState({} as any);
  const [error, setError] = useState("");
  const [modified, setModified] = useState(false);

  useEffect(() => {
    if (!newFormData || !modified || error) return;
    setFormData?.(newFormData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newFormData, modified, error]);

  useEffect(() => {
    if (!formData) setNewFormData({} as any);
    else setNewFormData(JSON.parse(JSON.stringify(formData)) as any);
  }, [formData]);

  useEffect(() => {
    if (!modified) setError("");
  }, [modified]);

  useEffect(() => {
    if (!formData || !newFormData) {
      setModified(false);
    } else if (
      newFormData?.FirstNameMI !== formData?.FirstNameMI ||
      newFormData?.LastName !== formData?.LastName ||
      newFormData?.Single !== formData?.Single ||
      newFormData?.MarriedFilingJointly !== formData?.MarriedFilingJointly ||
      newFormData?.MarriedFilingSeparately !== formData?.MarriedFilingSeparately ||
      newFormData?.HeadOfHousehold !== formData?.HeadOfHousehold ||
      newFormData?.QualifiedWidow !== formData?.QualifiedWidow
    ) {
      setModified(true);
    } else {
      setModified(false);
    }
  }, [newFormData, formData]);

  const handleSave = () => {
    console.log("Saving new f1040 form data", newFormData);
    setFormData(newFormData);
  };

  return (<>
    <Paper sx={{ p: 3 }}>
      <Grid container spacing={1}>

        <Grid item xs={12}>
          <Typography variant="h5">
            {"Form 1040"}
          </Typography>
        </Grid>

        <Grid item>
          <SelectOne
            label="Filing Status"
            choices={["Single", "Married Joint", "Married Separate", "Head of Household", "Widow"]}
            selection={
              newFormData.Single ? "Single"
              : newFormData.MarriedFilingJointly ? "Married Joint"
              : newFormData.MarriedFilingSeparately ? "Married Separate"
              : newFormData.HeadOfHousehold ? "Head of Household"
              : newFormData.QualifiedWidow ? "Widow"
              : ""
            }
            setSelection={selection => setNewFormData({
              ...newFormData,
              Single: selection === "Single",
              MarriedFilingJointly: selection === "Married Joint",
              MarriedFilingSeparately: selection === "Married Separate",
              HeadOfHousehold: selection === "Head of Household",
              QualifiedWidow: selection === "Widow",
            })}
          />
        </Grid>

        <Grid item>
          <TextInput 
            helperText={"First Name and Middle Initial"}
            label="First Name"
            setText={FirstNameMI => setNewFormData({ ...newFormData, FirstNameMI })}
            text={newFormData.FirstNameMI}
          />
        </Grid>

        <Grid item>
          <TextInput 
            helperText={"Last Name"}
            label="Last Name"
            setText={LastName => setNewFormData({ ...newFormData, LastName })}
            text={newFormData.LastName}
          />
        </Grid>

        <Grid item xs={12}>
          <Typography>
            {!modified ? "Enter formData info" : (error || "Form Data looks good")}
          </Typography>
        </Grid>

        <Grid item xs={12}>
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
