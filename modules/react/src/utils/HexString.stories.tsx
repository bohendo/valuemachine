import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";
import { insertVenue } from "@valuemachine/utils";

import { addressBook, address, account, bytes32, uuid } from "../constants";

import { HexString } from "./HexString";

export default { title: "HexString", component: HexString } as ComponentMeta<typeof HexString>;
const Template: ComponentStory<typeof HexString> = (args) => <HexString {...args} />;

export const Bytes32 = Template.bind({});
Bytes32.args = {
  display: "",
  value: bytes32,
};

export const Address = Template.bind({});
Address.args = {
  display: "",
  value: address,
};

export const NamedAddress = Template.bind({});
NamedAddress.args = {
  display: addressBook.getName(address, true),
  value: address,
};

export const Account = Template.bind({});
Account.args = {
  display: "",
  value: account,
};

export const NamedAccount = Template.bind({});
NamedAccount.args = {
  display: addressBook.getName(account, true),
  value: account,
};

export const VenueAccount = Template.bind({});
VenueAccount.args = {
  display: insertVenue(addressBook.getName(account, true), "StoryBookExample"),
  value: account,
};

export const TxUuid = Template.bind({});
TxUuid.args = {
  display: "",
  value: uuid,
};

export const Eth2Validator = Template.bind({});
Eth2Validator.args = {
  display: "",
  value: "Ethereum/ETH2/0xb9479574ce5e50a08d9cc6e85e81617177239ced93c61ca3410ea38f26b290b4d3c1e9cd005a6a15ba54d758adaad638",
};
