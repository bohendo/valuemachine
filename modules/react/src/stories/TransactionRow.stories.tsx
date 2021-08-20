import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { TransactionRow } from "../TransactionRow";

import { addressBook, transactions } from "./constants";

export default {
  title: "TransactionRow",
  component: TransactionRow,
} as ComponentMeta<typeof TransactionRow>;
const Template: ComponentStory<typeof TransactionRow> = (args) => <TransactionRow {...args} />;

export const Example = Template.bind({});
Example.args = {
  addressBook,
  tx: transactions.json[0],
};
