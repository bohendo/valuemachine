import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import React, { useState } from "react";

const useStyles = makeStyles((theme: Theme) => createStyles({
  main: {
    margin: theme.spacing(2),
  },
}));

type TimestampInputProps = {
  id?: string;
  label?: string;
  helperText?: string;
  setTimestamp?: (val: string) => void;
};
export const TimestampInput: React.FC<TimestampInputProps> = ({
  id: givenId,
  label: givenLabel,
  helperText,
  setTimestamp,
}: TimestampInputProps) => {
  const classes = useStyles();
  const [display, setDisplay] = useState("");
  const [error, setError] = useState("");

  const slugify = str =>
    str.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/--/g, "-").replace(/(^-|-$)/, "");

  const changeTimestamp = (event: React.ChangeEvent<{ value: unknown }>) => {
    if (typeof event.target.value !== "string") return;
    const display = event.target.value;
    let error, value;
    if (display.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$/)) {
      if (isNaN(new Date(display).getTime())) {
        value = "";
        error = "Timestamp is invalid";
      } else {
        value = display + "T01:00:00.000Z";
        error = "";
      }
    } else if (display === "") {
      value = "";
      error = "";
    } else {
      value = "";
      error = "Format timestamp as YYYY-MM-DD hh:mm:ss";
    }
    setError(error);
    setDisplay(display);
    setTimestamp?.(value);
  };

  const label = givenLabel || "Input Timestamp";
  const id = givenId || `input-timestamp-${slugify(label)}`;

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
      onChange={changeTimestamp}
      value={display || ""}
      variant="outlined"
    />
  );

};
