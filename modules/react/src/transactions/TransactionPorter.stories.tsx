import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { transactions } from "../constants";

import { TransactionPorter } from "./TransactionPorter";

export default { title: "TransactionPorter", component: TransactionPorter } as ComponentMeta<typeof TransactionPorter>;
const Template: ComponentStory<typeof TransactionPorter> = (args) =>
  <TransactionPorter {...args} />;

export const Example = Template.bind({});
Example.args = {
  transactions: transactions.json,
  setTransactions: console.log,
};
