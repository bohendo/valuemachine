import { getTxTagsError, TxTags } from "@valuemachine/transactions";
import React from "react";

import { Porter } from "../utils";

type TxTagsPorterProps = {
  txTags: TxTags,
  setTxTags: (val: TxTags) => void,
};
export const TxTagsPorter: React.FC<TxTagsPorterProps> = ({
  txTags,
  setTxTags,
}: TxTagsPorterProps) => (
  <Porter
    data={txTags}
    setData={setTxTags}
    name="txTags"
    title="TxTags"
    getError={getTxTagsError}
  />
);
