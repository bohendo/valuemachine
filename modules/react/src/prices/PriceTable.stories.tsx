import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { prices, unit } from "../constants";

import { PriceTable } from "./PriceTable";

export default {
  title: "PriceTable",
  component: PriceTable,
} as ComponentMeta<typeof PriceTable>;
const Template: ComponentStory<typeof PriceTable> = (args) => <PriceTable {...args} />;

export const OneUnit = Template.bind({});
OneUnit.args = {
  prices,
  unit,
};

export const AllUnits = Template.bind({});
AllUnits.args = {
  prices,
};
