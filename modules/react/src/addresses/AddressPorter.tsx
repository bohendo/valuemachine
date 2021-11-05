import { AddressBookJson } from "@valuemachine/types";
import { getAddressBookError } from "@valuemachine/utils";
import React from "react";

import { Porter } from "../utils";

type AddressPorterProps = {
  addressBook: AddressBookJson,
  setAddressBookJson: (val: AddressBookJson) => void,
};
export const AddressPorter: React.FC<AddressPorterProps> = ({
  addressBook,
  setAddressBookJson,
}: AddressPorterProps) => (
  <Porter
    data={addressBook}
    setData={setAddressBookJson}
    name="addressBook"
    title="Address Book"
    getError={getAddressBookError}
  />
);
