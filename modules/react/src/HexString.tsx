import Tooltip from "@material-ui/core/Tooltip";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import React, { useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";

const useStyles = makeStyles((theme) => ({
  label: {
    // maxWidth: "12em",
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

  if (!display) {
    const parts = value.split("/0x");
    const prefix = parts.length > 1 ? `${parts[0]}/` : "";
    const rawHex = parts.length > 1 ? parts[1] : value.replace(/^0x/, "");
    display = `${prefix}0x${rawHex.substring(0, 4)}..${
      rawHex.length > 40 ? "." : ""
    }${rawHex.substring(rawHex.length - 4)}`;
  }

  return (
    <CopyToClipboard
      onCopy={() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      text={value}
    >
      <Tooltip arrow title={copied ? "Copied to clipboard" : value}>
        <Typography noWrap className={classes.label}>
          {display}
        </Typography>
      </Tooltip>
    </CopyToClipboard>
  );
};
