import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { addressBook, transactions } from "../constants";

import { TransactionTable } from "./TransactionTable";

export default {
  title: "TransactionTable",
  component: TransactionTable,
} as ComponentMeta<typeof TransactionTable>;
const Template: ComponentStory<typeof TransactionTable> = (args) => <TransactionTable {...args} />;

export const Example = Template.bind({});
Example.args = {
  addressBook,
  transactions,
};
