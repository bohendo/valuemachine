import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { BalanceTable } from "../BalanceTable";

import { addressBook, vm } from "./constants";

export default {
  title: "BalanceTable",
  component: BalanceTable,
} as ComponentMeta<typeof BalanceTable>;
const Template: ComponentStory<typeof BalanceTable> = (args) => <BalanceTable {...args} />;

export const Example = Template.bind({});
Example.args = {
  addressBook,
  vm,
};
