import TextField from "@mui/material/TextField";
import React, { useState } from "react";

type TextInputProps = {
  id?: string;
  label?: string;
  helperText?: string;
  setText?: (val: string) => void;
  text?: string;
  getError?: (val: string) => string;
  fullWidth?: boolean;
};
export const TextInput: React.FC<TextInputProps> = ({
  id: givenId,
  label: givenLabel,
  helperText,
  setText,
  text,
  getError,
  fullWidth,
}: TextInputProps) => {
  const [error, setError] = useState("");

  const slugify = str =>
    str.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/--/g, "-").replace(/(^-|-$)/, "");

  const changeText = (event: React.ChangeEvent<{ value: unknown }>) => {
    if (typeof event.target.value !== "string") return;
    const value = event.target.value || "";
    setText?.(value);
    const error = !value ? "" : getError?.(value) || "";
    setError(error);
  };

  const label = givenLabel || "Input Text";
  const id = givenId || `input-text-${slugify(label)}`;

  return (
    <TextField
      autoComplete="off"
      sx={{ m: 2 }}
      error={!!error}
      fullWidth={!!fullWidth}
      helperText={error || helperText || ""}
      id={id || slugify(label)}
      label={label}
      margin="normal"
      name={id}
      onChange={changeText}
      value={text || ""}
      variant="outlined"
    />
  );

};
