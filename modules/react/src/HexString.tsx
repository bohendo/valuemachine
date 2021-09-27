import Tooltip from "@material-ui/core/Tooltip";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import { makeStyles } from "@material-ui/core/styles";
import ExploreIcon from "@material-ui/icons/Explore";
import { EvmNames } from "@valuemachine/transactions";
import React, { useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";

const { Ethereum, Polygon } = EvmNames;

const useStyles = makeStyles((theme) => ({
  icon: {
    marginTop: theme.spacing(-0.5),
  },
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

  const network = value.split("/")[0];
  const explorer = network === Ethereum ? "https://etherscan.io"
    : network === Polygon ? "https://polygonscan.com"
    : "";
  const hex = value.split("/").pop();
  const link = (explorer && hex?.length === 42) ? `${explorer}/address/${hex}`
    : (explorer && hex?.length === 66) ? `${explorer}/tx/${hex}`
    : "";

  return (
    <React.Fragment>
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
            {link ?
              <IconButton
                className={classes.icon}
                color="secondary"
                href={link}
                size="small"
              >
                <ExploreIcon/>
              </IconButton>
              : null
            }
          </Typography>
        </Tooltip>
      </CopyToClipboard>
    </React.Fragment>
  );
};
