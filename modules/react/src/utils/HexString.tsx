import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import ExploreIcon from "@mui/icons-material/Explore";
import { EvmNames } from "@valuemachine/transactions";
import React, { useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";

const { Ethereum, Polygon } = EvmNames;

export const HexString = ({
  value,
  display,
}: {
  value: string,
  display?: string,
}) => {
  const [copied, setCopied] = useState(false);

  const parts = value.split("/");
  const hex = parts.pop() || "";
  const prefix = parts.join("/");

  const explorer = !prefix ? ""
    : prefix.startsWith(`${Ethereum}/ETH2`) ? "https://beaconscan.com"
    : prefix.startsWith(Ethereum) ? "https://etherscan.io"
    : prefix.startsWith(Polygon) ? "https://polygonscan.com"
    : "";

  const link = !explorer ? ""
    : hex?.length === 42 ? `${explorer}/address/${hex}`
    : hex?.length === 66 ? `${explorer}/tx/${hex}`
    : hex?.length === 98 ? `${explorer}/validator/${hex}`
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
          <Box sx={{
            m: 0,
            display: "flex",
            flexWrap: "wrap",
            overflowWrap: "anywhere",
            wordBreak: "normal",
          }}>
            {displayParts.map((part,i) => (
              <Typography key={i} noWrap>
                {`${part}${i < displayParts.length - 1 ? "/" : ""}`}
              </Typography>
            ))}
            {link ?
              <IconButton
                sx={{ mt: -0.5 }}
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
          </Box>
        </Tooltip>
      </CopyToClipboard>
    </React.Fragment>
  );
};
