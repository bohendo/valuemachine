import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { addressBook, csvFiles, transactions as customTxns } from "../constants";

import { InputPorter } from "./InputPorter";

export default { title: "InputPorter", component: InputPorter } as ComponentMeta<typeof InputPorter>;
const Template: ComponentStory<typeof InputPorter> = (args) => <InputPorter {...args} />;

export const Example = Template.bind({});
Example.args = {
  csvFiles,
  setCsvFiles: console.log,
  addressBook: addressBook.json,
  setAddressBook: console.log,
  customTxns: customTxns.json,
  setCustomTxns: console.log,
};
