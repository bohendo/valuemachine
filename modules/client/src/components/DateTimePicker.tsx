import React from "react";
import {
  DateTimePicker,
  MuiPickersUtilsProvider
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";

export const DateTime = (props: any) => {

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
};
