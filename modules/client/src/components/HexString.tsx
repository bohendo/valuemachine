import Tooltip from "@material-ui/core/Tooltip";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import React, { useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";

const useStyles = makeStyles((theme) => ({
  label: {
    maxWidth: "8em",
    margin: theme.spacing(0),
  },
  pre: {
    margin: theme.spacing(0),
  },
}));

export const HexString = ({
  value,
  display,
}: {
  value: string,
  display?: string,
}) => {
  const [copied, setCopied] = useState(false);
  const classes = useStyles();

  return (
    <CopyToClipboard
      onCopy={() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      text={value}
    >
      <Tooltip arrow title={copied ? "Copied to clipboard" : value}>

        <Typography noWrap className={classes.label}>
          {
            display ||
            <pre className={classes.pre}>
              {`${value.substring(0, 6)}..${value.substring(value.length - 4)}`}
            </pre>
          }
        </Typography>

      </Tooltip>
    </CopyToClipboard>
  );
};
