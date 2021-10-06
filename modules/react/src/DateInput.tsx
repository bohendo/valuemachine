import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import React, { useState } from "react";

const useStyles = makeStyles((theme: Theme) => createStyles({
  main: {
    margin: theme.spacing(2),
  },
}));

type DateInputProps = {
  id?: string;
  label?: string;
  helperText?: string;
  setDate?: (val: string) => void;
};
export const DateInput: React.FC<DateInputProps> = ({
  id: givenId,
  label: givenLabel,
  helperText,
  setDate,
}: DateInputProps) => {
  const classes = useStyles();
  const [display, setDisplay] = useState("");
  const [error, setError] = useState("");

  const slugify = str =>
    str.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/--/g, "-").replace(/(^-|-$)/, "");

  const changeDate = (event: React.ChangeEvent<{ value: unknown }>) => {
    if (typeof event.target.value !== "string") return;
    const display = event.target.value;
    let error, value;
    if (display.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
      if (isNaN(new Date(display).getTime())) {
        value = "";
        error = "Date is invalid";
      } else {
        value = display + "T01:00:00.000Z";
        error = "";
      }
    } else if (display === "") {
      value = "";
      error = "";
    } else {
      value = "";
      error = "Format date as YYYY-MM-DD";
    }
    setError(error);
    setDisplay(display);
    setDate?.(value);
  };

  const label = givenLabel || "Input Date";
  const id = givenId || `input-date-${slugify(label)}`;

  return (
    <TextField
      autoComplete="off"
      className={classes.main}
      error={!!error}
      helperText={error || helperText || "YYYY-MM-DD"}
      id={id}
      label={label}
      margin="normal"
      name={id}
      onChange={changeDate}
      value={display || ""}
      variant="outlined"
    />
  );

};
