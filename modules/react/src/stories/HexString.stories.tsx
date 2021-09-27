import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { HexString } from "../HexString";

import { addressBook, address, account, bytes32, uuid } from "./constants";

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

export const TxUuid = Template.bind({});
TxUuid.args = {
  display: "",
  value: uuid,
};
