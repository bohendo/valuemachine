import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import React from "react";

type ConfirmProps = {
  action: () => void;
  message: string;
  setMessage: (val: string) => void;
};
export const Confirm: React.FC<ConfirmProps> = ({
  action,
  message,
  setMessage,
}: ConfirmProps) => {
  return (<>
    <Snackbar open={!!message} autoHideDuration={10000} onClose={() => setMessage("")}>
      <Alert onClose={() => setMessage("")} severity="warning">
        {message}
        <Button size="small" variant="text" color="inherit" onClick={action} sx={{ my: -1 }}>
          {"YES"}
        </Button>
      </Alert>
    </Snackbar>
  </>);
};
