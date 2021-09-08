import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { TaxTable } from "../TaxTable";

import { addressBook, vm, guard, prices } from "./constants";

export default {
  title: "TaxTable",
  component: TaxTable,
} as ComponentMeta<typeof TaxTable>;
const Template: ComponentStory<typeof TaxTable> = (args) => <TaxTable {...args} />;

export const Example = Template.bind({});
Example.args = {
  addressBook,
  guard,
  prices,
  vm,
};