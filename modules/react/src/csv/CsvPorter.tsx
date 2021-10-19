import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { cleanCsv } from "@valuemachine/transactions";
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

  const handleCsvFileImport = (event: any) => {
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
    <Paper sx={{ p: 3, maxWidth: "24em" }}>
      <Typography variant="h6">
        {"Import CSV File"}
      </Typography>
      <Box sx={{ mb: 1, mt: 1 }}>
        <input
          accept="text/csv"
          id="file-importer"
          onChange={handleCsvFileImport}
          type="file"
        />
      </Box>
    </Paper>
  </>);
};


