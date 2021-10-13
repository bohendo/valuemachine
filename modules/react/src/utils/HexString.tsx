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
    "& > *": {
      overflowWrap: "anywhere",
      wordBreak: "normal",
    },
    margin: theme.spacing(0),
    display: "flex",
    flexWrap: "wrap",
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

  const parts = value.split("/");
  const hex = parts.pop() || "";
  const prefix = parts.join("/");

  const explorer = !prefix ? ""
    : prefix.startsWith(Ethereum) ? "https://etherscan.io"
    : prefix.startsWith(Polygon) ? "https://polygonscan.com"
    : "";

  const link = !explorer ? ""
    : hex?.length === 42 ? `${explorer}/address/${hex}`
    : hex?.length === 66 ? `${explorer}/tx/${hex}`
    : "";

  const abrv = str => `${str.substring(0, 6)}..${str.substring(str.length - 4)}`;
  const displayParts = (display || (hex.length < 10
    ? (prefix ? `${prefix}/${hex}` : `${hex}`)
    : (prefix ? `${prefix}/${abrv(hex)}` : `${abrv(hex)}`)
  )).split("/");

  return (
    <React.Fragment>
      <CopyToClipboard
        onCopy={() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        text={value}
      >
        <Tooltip
          arrow
          placement="bottom-start"
          title={copied ? "Copied to clipboard" : value}
        >
          <span className={classes.label}>
            {displayParts.map((part,i) => (
              <Typography key={i} noWrap>
                {`${part}${i < displayParts.length - 1 ? "/" : ""}`}
              </Typography>
            ))}
            {link ?
              <IconButton
                className={classes.icon}
                color="secondary"
                href={link}
                rel="noreferrer"
                size="small"
                target="_blank"
              >
                <ExploreIcon/>
              </IconButton>
              : null
            }
          </span>
        </Tooltip>
      </CopyToClipboard>
    </React.Fragment>
  );
};
