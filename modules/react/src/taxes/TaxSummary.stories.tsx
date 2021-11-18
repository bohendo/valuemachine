import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { guard, taxInput } from "../constants";

import { TaxSummary } from "./TaxSummary";

export default {
  title: "TaxSummary",
  component: TaxSummary,
} as ComponentMeta<typeof TaxSummary>;
const Template: ComponentStory<typeof TaxSummary> = (args) => <TaxSummary {...args} />;

export const Example = Template.bind({});
Example.args = {
  guard,
  taxInput,
  taxRows: [],
};

