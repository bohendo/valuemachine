import TextField from "@mui/material/TextField";
import React, { useEffect, useState } from "react";

type DateTimeInputProps = {
  id?: string;
  label?: string;
  helperText?: string;
  timestamp?: string;
  setDateTime?: (val: string) => void;
};
export const DateTimeInput: React.FC<DateTimeInputProps> = ({
  id: givenId,
  label: givenLabel,
  helperText,
  timestamp,
  setDateTime,
}: DateTimeInputProps) => {
  const [display, setDisplay] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!timestamp) return;
    setDisplay(timestamp);
  }, [timestamp]);

  const slugify = str =>
    str.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/--/g, "-").replace(/(^-|-$)/, "");

  const changeDateTime = (event: React.ChangeEvent<{ value: unknown }>) => {
    if (typeof event.target.value !== "string") return;
    const display = event.target.value;
    setDisplay(display);
    let error, timestamp;
    if (display === "") {
      timestamp = "";
      error = "";
    } else if (display.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$/)) {
      if (isNaN(new Date(display).getTime())) {
        timestamp = "";
        error = "DateTime is invalid";
      } else {
        timestamp = new Date(display + "Z").toISOString();
        error = "";
      }
    } else if (display.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
      if (isNaN(new Date(display).getTime())) {
        timestamp = "";
        error = "DateTime is invalid";
      } else {
        timestamp = new Date(display + "T00:00:00Z").toISOString();
        error = "";
      }
    } else {
      timestamp = "";
      error = "Format timestamp as YYYY-MM-DD hh:mm:ss";
    }
    setError(error);
    if (timestamp && !error) {
      setDateTime?.(timestamp);
    }
  };

  const label = givenLabel || "Input DateTime";
  const id = givenId || `input-timestamp-${slugify(label)}`;

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
