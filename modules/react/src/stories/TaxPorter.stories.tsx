import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { TaxPorter } from "../TaxPorter";

import { vm, guard, prices } from "./constants";

export default {
  title: "TaxPorter",
  component: TaxPorter,
} as ComponentMeta<typeof TaxPorter>;
const Template: ComponentStory<typeof TaxPorter> = (args) => <TaxPorter {...args} />;

export const Example = Template.bind({});
Example.args = {
  guard,
  prices,
  vm,
};
