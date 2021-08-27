import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { Balances } from "../Balances";

import { balances } from "./constants";

export default {
  title: "Balances",
  component: Balances,
} as ComponentMeta<typeof Balances>;
const Template: ComponentStory<typeof Balances> = (args) => <Balances {...args} />;

export const Example = Template.bind({});
Example.args = {
  balances
};


