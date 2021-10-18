import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import React from "react";

type SelectManyProps = {
  choices?: string[],
  id?: string,
  label?: string,
  selection?: string,
  setSelection?: (val: string) => void,
  sx?: any;
  toDisplay?: (val: string) => string,
};
export const SelectMany: React.FC<SelectManyProps> = ({
  id: givenId,
  label: givenLabel,
  choices,
  selection,
  setSelection,
  sx,
  toDisplay,
}: SelectManyProps) => {

  const slugify = str =>
    str.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/--/g, "-").replace(/(^-|-$)/, "");

  const handleChange = (event: SelectChangeEvent<string>) => {
    if (typeof event.target.value !== "string") return;
    setSelection?.(event.target.value);
  };

  const label = givenLabel || "Select One";
  const id = givenId || `select-many-${slugify(label)}`;

  return (
    <Box sx={{ ...sx }}>
      <FormControl sx={{ p: 1, minWidth: "12em" }}>
        <InputLabel id={`${id}-label`} variant="standard">{label}</InputLabel>
        <Select
          id={id}
          labelId={`${id}-label`}
          onChange={handleChange}
          value={selection || ""}
          variant="standard"
        >
          <MenuItem value={""}>-</MenuItem>
          {(choices || []).map((option, i) => (
            <MenuItem key={i} value={option}>{toDisplay ? toDisplay(option) : option}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};
