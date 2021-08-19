import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";
import { getAddressBook } from "@valuemachine/transactions";
import {
  Assets,
  TransactionSources,
  TransferCategories,
} from "@valuemachine/types";

import { TransactionTable } from "../TransactionTable";

export default {
  title: "TransactionTable",
  component: TransactionTable,
} as ComponentMeta<typeof TransactionTable>;
const Template: ComponentStory<typeof TransactionTable> = (args) => <TransactionTable {...args} />;

export const Example = Template.bind({});
Example.args = {
  addressBook: getAddressBook(),
  transactionsJson: [{
    index: 0,
    date: "2020-01-01T01:00:00Z",
    hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    sources: [TransactionSources.Ethereum],
    transfers: [{
      index: 0,
      category: TransferCategories.Income,
      asset: Assets.ETH,
      from: "0x1111111111111111111111111111111111111111",
      quantity: "1.0",
      to: "0x2222222222222222222222222222222222222222",
    }],
  }],
};
