import TextField from "@mui/material/TextField";
import React, { useEffect, useState } from "react";

type DateTimeInputProps = {
  id?: string;
  label?: string;
  helperText?: string;
  dateTime?: string;
  setDateTime?: (val: string) => void;
};
export const DateTimeInput: React.FC<DateTimeInputProps> = ({
  id: givenId,
  label: givenLabel,
  helperText,
  dateTime,
  setDateTime,
}: DateTimeInputProps) => {
  const [display, setDisplay] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!dateTime) return;
    setDisplay(dateTime.replace("T", " ").replace(/(.000)?Z/, ""));
  }, [dateTime]);

  const slugify = str =>
    str.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/--/g, "-").replace(/(^-|-$)/, "");

  const changeDateTime = (event: React.ChangeEvent<{ value: unknown }>) => {
    if (typeof event.target.value !== "string") return;
    const display = event.target.value;
    setDisplay(display);
    let error, dateTime;
    if (display === "") {
      dateTime = "";
      error = "";
    } else if (display.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$/)) {
      if (isNaN(new Date(display).getTime())) {
        dateTime = "";
        error = "DateTime is invalid";
      } else {
        dateTime = new Date(display + "Z").toISOString();
        error = "";
      }
    } else if (display.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
      if (isNaN(new Date(display).getTime())) {
        dateTime = "";
        error = "DateTime is invalid";
      } else {
        dateTime = new Date(display + "T00:00:00Z").toISOString();
        error = "";
      }
    } else {
      dateTime = "";
      error = "Format dateTime as YYYY-MM-DD hh:mm:ss";
    }
    setError(error);
    if (dateTime && !error) {
      setDateTime?.(dateTime);
    }
  };

  const label = givenLabel || "Input DateTime";
  const id = givenId || `input-date-time-${slugify(label)}`;

  return (
    <TextField
      autoComplete="off"
      sx={{ m: 2 }}
      error={!!error}
      helperText={error || helperText || "YYYY-MM-DD"}
      id={id}
      label={label}
      margin="normal"
      name={id}
      onChange={changeDateTime}
      value={display || ""}
      variant="outlined"
    />
  );

};
