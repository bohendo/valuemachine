import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
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
        const importedFile = reader.result as string;
        setCsvFiles([...csvFiles, {
          name: file.name,
          data: importedFile,
        }] as CsvFiles);
      } catch (e) {
        console.error(e);
      }
    };
  };

  return (<>

    <Card sx={{ p: 2 }}>
      <CardHeader title={"Import CSV File"}/>
      <Box sx={{ mb: 4, mt: 1, mx: 4 }}>
        <input
          accept="text/csv"
          id="file-importer"
          onChange={handleCsvFileImport}
          type="file"
        />
      </Box>
    </Card>

  </>);
};


