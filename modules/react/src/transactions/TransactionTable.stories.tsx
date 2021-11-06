import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { addressBook, transactions } from "../constants";

import { TransactionTable } from "./TransactionTable";

export default {
  title: "TransactionTable",
  component: TransactionTable,
} as ComponentMeta<typeof TransactionTable>;
const Template: ComponentStory<typeof TransactionTable> = (args) => <TransactionTable {...args} />;

export const Editable = Template.bind({});
Editable.args = {
  addressBook,
  transactions,
  setTransactions: console.log,
};

export const Readonly = Template.bind({});
Readonly.args = {
  addressBook,
  transactions,
};
