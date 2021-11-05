import UploadIcon from "@mui/icons-material/FileUpload";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { CsvSources, cleanCsv } from "@valuemachine/transactions";
import { CsvFiles } from "@valuemachine/types";
import React from "react";

type CsvPorterProps = {
  csvFiles: CsvFiles,
  setCsvFiles: (val: CsvFiles) => void,
};
export const CsvPorter: React.FC<CsvPorterProps> = ({
  csvFiles,
  setCsvFiles,
}: CsvPorterProps) => {

  const handleImport = (event: any) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => {
      try {
        const csv = cleanCsv(typeof reader.result === "string" ? reader.result : "", file.name);
        setCsvFiles({ ...csvFiles, [csv.digest]: csv });
      } catch (e) {
        console.error(e);
      }
    };
  };

  return (<>
    <Paper sx={{ p: 3, maxWidth: "48em" }}>
      <Grid container spacing={2} justifyContent="flex-start">
        <Grid item>
          <Typography variant="h6">
            {"Import CSV File"}
          </Typography>
          <Typography variant="body2">
            {`Supported file types: [${Object.keys(CsvSources).join(", ")}]`}
          </Typography>
          <Button
            sx={{ my: 2 }}
            color="primary"
            size="small"
            component="label"
            startIcon={<UploadIcon />}
            variant="contained"
          >
            Import
            <input
              accept="text/csv"
              id="csv-importer"
              onChange={handleImport}
              type="file"
              hidden
            />
          </Button>
        </Grid>
      </Grid>
    </Paper>
  </>);
};
