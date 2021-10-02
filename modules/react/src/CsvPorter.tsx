import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import Card from "@material-ui/core/Card";
import CardHeader from "@material-ui/core/CardHeader";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import {
  CsvFiles,
} from "@valuemachine/types";
import { 
  CsvSources,
} from "@valuemachine/transactions";
import React, { useState } from "react";

const useStyles = makeStyles((theme: Theme) => createStyles({
  card: {
    margin: theme.spacing(1),
    padding: theme.spacing(2),
    maxWidth: "98%",
  },
  select: {
    margin: theme.spacing(2),
    minWidth: 160,
  },
  importer: {
    marginBottom: theme.spacing(1),
    marginLeft: theme.spacing(4),
    marginRight: theme.spacing(4),
    marginTop: theme.spacing(4),
  },
}));

type CsvPorterProps = {
  csvFiles: CsvFiles,
  setCsvFiles: (val: CsvFiles) => void,
};
export const CsvPorter: React.FC<CsvPorterProps> = ({
  csvFiles,
  setCsvFiles,
}: CsvPorterProps) => {
  const [importFileType, setImportFileType] = useState("");
  const classes = useStyles();

  const handleFileTypeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    if (typeof event.target.value !== "string") return;
    console.log(`Setting file type based on event target:`, event.target.value);
    setImportFileType(event.target.value);
  };

  const handleCsvFileImport = (event: any) => {
    const file = event.target.files[0];
    console.log(`Importing ${importFileType} file`, file);
    if (!importFileType || !file) return;
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => {
      try {
        const importedFile = reader.result as string;
        console.log(`Imported ${file.name}`);
        setCsvFiles([...csvFiles, {
          name: file.name,
          data: importedFile,
          type: importFileType,
        }] as CsvFiles);
      } catch (e) {
        console.error(e);
      }
    };
  };

  return (
    <React.Fragment>

      <Card className={classes.card}>
        <CardHeader title={"Import CSV File"}/>
        <FormControl className={classes.select}>
          <InputLabel id="select-file-type-label">File Type</InputLabel>
          <Select
            labelId="select-file-type-label"
            id="select-file-type"
            value={importFileType || ""}
            onChange={handleFileTypeChange}
          >
            <MenuItem value={""}>-</MenuItem>
            {Object.keys(CsvSources).map((source, key) => (
              <MenuItem key={key} value={source}>{source}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <input
          accept="text/csv"
          className={classes.importer}
          disabled={!importFileType}
          id="file-importer"
          onChange={handleCsvFileImport}
          type="file"
        />
      </Card>

    </React.Fragment>
  );
};


