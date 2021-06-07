import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import React, { useState } from "react";

const useStyles = makeStyles((theme: Theme) => createStyles({
  dateFilter: {
    margin: theme.spacing(2),
  },
}));

export const InputDate = ({
  id,
  label,
  setDate,
}: {
  id: string;
  label: string;
  setDate: (val: string) => void;
}) => {
  const classes = useStyles();
  const [display, setDisplay] = useState("");
  const [error, setError] = useState("");

  const slugify = str =>
    str.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/--/g, "-").replace(/(^-|-$)/, "");

  const changeFilterDate = (event: React.ChangeEvent<{ value: string }>) => {
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
    setDate(value);
  };

  return (
    <TextField
      autoComplete="off"
      className={classes.dateFilter}
      error={!!error}
      helperText={error || "YYYY-MM-DD"}
      id={slugify(label)}
      label={label}
      margin="normal"
      name={id}
      onChange={changeFilterDate}
      value={display || ""}
      variant="outlined"
    />
  );

  /*
  return (
    <MuiPickersUtilsProvider utils={DateFnsUtils}>
      <DateTimePicker
        variant="inline"
        label={props.label}
        format="yyyy/MM/dd HH:mm"
        value={props.date}
        onChange={(date: any) => props.setDate(date)}
      />
    </MuiPickersUtilsProvider>
  );
  */
};
