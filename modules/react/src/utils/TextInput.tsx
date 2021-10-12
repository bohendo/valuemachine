import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import React, { useState } from "react";

const useStyles = makeStyles((theme: Theme) => createStyles({
  main: {
    margin: theme.spacing(2),
  },
}));

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
  const classes = useStyles();
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
      className={classes.main}
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
