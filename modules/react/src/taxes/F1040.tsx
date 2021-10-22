import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { requestFilledForm, Forms } from "@valuemachine/taxes";
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
  const [newFormData, setNewFormData] = useState({} as any /* initialize form w empty strings */);
  const [error, setError] = useState("");
  const [modified, setModified] = useState(false);

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
      newFormData?.Single !== formData?.Single ||
      newFormData?.MarriedFilingJointly !== formData?.MarriedFilingJointly ||
      newFormData?.MarriedFilingSeparately !== formData?.MarriedFilingSeparately ||
      newFormData?.HeadOfHousehold !== formData?.HeadOfHousehold ||
      newFormData?.QualifiedWidow !== formData?.QualifiedWidow ||

      newFormData?.FirstNameMI !== formData?.FirstNameMI ||
      newFormData?.LastName !== formData?.LastName ||
      newFormData?.SocialSecurityNumber !== formData?.SocialSecurityNumber ||

      newFormData?.SpouseFirstNameMI !== formData?.SpouseFirstNameMI ||
      newFormData?.SpouseLastName !== formData?.SpouseLastName ||
      newFormData?.SpouseSocialSecurityNumber !== formData?.SpouseSocialSecurityNumber ||

      newFormData?.StreetAddress !== formData?.StreetAddress ||
      newFormData?.Apt !== formData?.Apt ||
      newFormData?.City !== formData?.City ||
      newFormData?.State !== formData?.State ||
      newFormData?.Zip !== formData?.Zip ||

      newFormData?.ForeignCountry !== formData?.ForeignCountry ||
      newFormData?.ForeignState !== formData?.ForeignState ||
      newFormData?.ForeignZip !== formData?.ForeignZip ||

      newFormData?.L1 !== formData?.L1
    ) {
      setModified(true);
    } else {
      setModified(false);
    }
  }, [newFormData, formData]);

  const handleSave = () => {
    console.log("Saving new f1040 form data", newFormData);
    setFormData?.(newFormData);
  };

  const handleDownload = async () => {
    console.log("Downloading new f1040 form w data:", newFormData);
    await requestFilledForm("f1040", newFormData, window);
  };

  return (<>
    <Paper sx={{ p: 3 }}>
      <Grid container spacing={1}>

        <Grid item xs={12}>
          <Typography variant="h4">
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

        <Grid item xs={12}>
          <Typography variant="h5">
            {"Personal Info"}
          </Typography>
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

        <Grid item>
          <TextInput
            helperText={"Social Security Number"}
            label="Social Security Number"
            setText={SocialSecurityNumber => setNewFormData({
              ...newFormData,
              SocialSecurityNumber
            })}
            text={newFormData.SocialSecurityNumber}
          />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h5">
            {"Spouse Info"}
          </Typography>
        </Grid>

        <Grid item>
          <TextInput
            helperText={"Spouse's First Name and Middle Initial"}
            label="Spouse First Name"
            setText={SpouseFirstNameMI => setNewFormData({ ...newFormData, SpouseFirstNameMI })}
            text={newFormData.SpouseFirstNameMI}
          />
        </Grid>

        <Grid item>
          <TextInput
            helperText={"Spouse's Last Name"}
            label="Spouse Last Name"
            setText={SpouseLastName => setNewFormData({ ...newFormData, SpouseLastName })}
            text={newFormData.SpouseLastName}
          />
        </Grid>

        <Grid item>
          <TextInput
            helperText={"Spouse's Social Security Number"}
            label="Spouse Social Security Number"
            setText={SpouseSocialSecurityNumber => setNewFormData({
              ...newFormData,
              SpouseSocialSecurityNumber,
            })}
            text={newFormData.SpouseSocialSecurityNumber}
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
            setText={StreetAddress => setNewFormData({ ...newFormData, StreetAddress })}
            text={newFormData.StreetAddress}
          />
        </Grid>

        <Grid item>
          <TextInput
            helperText={"Apartment Number"}
            label="Apt"
            setText={Apt => setNewFormData({ ...newFormData, Apt })}
            text={newFormData.Apt}
          />
        </Grid>

        <Grid item>
          <TextInput
            helperText={"City"}
            label="City"
            setText={City => setNewFormData({ ...newFormData, City })}
            text={newFormData.City}
          />
        </Grid>

        <Grid item>
          <TextInput
            helperText={"State"}
            label="State"
            setText={State => setNewFormData({ ...newFormData, State })}
            text={newFormData.State}
          />
        </Grid>

        <Grid item>
          <TextInput
            helperText={"Zip"}
            label="Zip"
            setText={Zip => setNewFormData({ ...newFormData, Zip })}
            text={newFormData.Zip}
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
            label="Foreign Country Name"
            setText={ForeignCountry => setNewFormData({ ...newFormData, ForeignCountry })}
            text={newFormData.ForeignCountry}
          />
        </Grid>

        <Grid item>
          <TextInput
            helperText={"Foreign Province/State/County"}
            label="Foreign Province/State/County"
            setText={ForeignState => setNewFormData({ ...newFormData, ForeignState })}
            text={newFormData.ForeignState}
          />
        </Grid>

        <Grid item>
          <TextInput
            helperText={"Foreign Postal Code"}
            label="Foreign Postal Code"
            setText={ForeignZip => setNewFormData({ ...newFormData, ForeignZip })}
            text={newFormData.ForeignZip}
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
            setText={L1 => setNewFormData({ ...newFormData, L1 })}
            text={newFormData.L1}
          />
        </Grid>

        <Grid item xs={12}>
          <Typography>
            {!modified ? "Enter formData info" : (error || "Form Data looks good")}
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

        <Grid item>
          <Button
            disabled={!!error}
            onClick={handleDownload}
            variant="contained"
          >
            {"Download"}
          </Button>
        </Grid>

      </Grid>
    </Paper>
  </>);
};
