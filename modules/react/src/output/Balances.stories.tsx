import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { balances } from "../constants";

import { BalanceDisplay } from "./Balances";

export default {
  title: "Balances",
  component: BalanceDisplay,
} as ComponentMeta<typeof BalanceDisplay>;
const Template: ComponentStory<typeof BalanceDisplay> = (args) => <BalanceDisplay {...args} />;

export const Example = Template.bind({});
Example.args = {
  balances
};


