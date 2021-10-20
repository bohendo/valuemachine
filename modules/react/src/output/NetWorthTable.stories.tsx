import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { balances, prices, unit } from "../constants";

import { NetWorthTable } from "./NetWorthTable";

export default {
  title: "NetWorthTable",
  component: NetWorthTable,
} as ComponentMeta<typeof NetWorthTable>;
const Template: ComponentStory<typeof NetWorthTable> = (args) => <NetWorthTable {...args} />;

export const Example = Template.bind({});
Example.args = {
  balances,
  prices,
  unit,
};
