import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { TaxInputEditor } from "./TaxInputEditor";

export default {
  title: "TaxInputEditor",
  component: TaxInputEditor,
} as ComponentMeta<typeof TaxInputEditor>;
const Template: ComponentStory<typeof TaxInputEditor> = (args) => <TaxInputEditor {...args} />;

export const Example = Template.bind({});
Example.args = {
  taxInput: {},
  setTaxInput: console.log,
};
