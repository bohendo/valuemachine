import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { guard, taxInput } from "../constants";

import { TaxPorter } from "./TaxPorter";

export default {
  title: "TaxPorter",
  component: TaxPorter,
} as ComponentMeta<typeof TaxPorter>;
const Template: ComponentStory<typeof TaxPorter> = (args) => <TaxPorter {...args} />;

export const Example = Template.bind({});
Example.args = {
  guard,
  taxInput,
  taxRows: [],
};
