import { getTaxInputError, TaxInput } from "@valuemachine/taxes";
import React from "react";

import { Porter } from "../utils";

type TransactionPorterProps = {
  taxInput: TaxInput,
  setTaxInput: (val: TaxInput) => void,
};
export const TransactionPorter: React.FC<TransactionPorterProps> = ({
  taxInput,
  setTaxInput,
}: TransactionPorterProps) => (
  <Porter
    data={taxInput}
    setData={setTaxInput}
    name="taxInput"
    title="TaxInput"
    getError={getTaxInputError}
  />
);
