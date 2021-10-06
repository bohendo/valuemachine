import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import React from "react";

const useStyles = makeStyles((theme: Theme) => createStyles({
  dropdown: {
    margin: theme.spacing(3),
    minWidth: theme.spacing(20),
  },
}));

type SelectOneProps = {
  id: string,
  label: string,
  options: string,
  selection: string,
  setSelection: (val: string) => void,
  toDisplay?: (val: string) => string,
};
export const SelectOne: React.FC<SelectOneProps> = ({
  id,
  label,
  options,
  selection,
  setSelection,
  toDisplay,
}: SelectOneProps) => {
  const classes = useStyles();

  const handleFilterTypeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    if (typeof event.target.value !== "string") return;
    setSelection(event.target.value);
  };

  return (
    <FormControl className={classes.dropdown}>
      <InputLabel id={`${id}-label`}>{label}</InputLabel>
      <Select
        labelId={`${id}-label`}
        id={id}
        value={selection || ""}
        onChange={handleFilterTypeChange}
      >
        <MenuItem value={""}>-</MenuItem>
        {options.map((option, i) => (
          <MenuItem key={i} value={option}>{toDisplay ? toDisplay(option) : option}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );

};
