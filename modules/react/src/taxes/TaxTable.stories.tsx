import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { vm, guard, prices } from "../constants";

import { TaxTable } from "./TaxTable";

export default {
  title: "TaxTable",
  component: TaxTable,
} as ComponentMeta<typeof TaxTable>;
const Template: ComponentStory<typeof TaxTable> = (args) => <TaxTable {...args} />;

export const Example = Template.bind({});
Example.args = {
  guard,
  prices,
  vm,
};
