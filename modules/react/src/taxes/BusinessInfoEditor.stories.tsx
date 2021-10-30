import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { BusinessInfoEditor } from "./BusinessInfoEditor";

export default {
  title: "BusinessInfoEditor",
  component: BusinessInfoEditor,
} as ComponentMeta<typeof BusinessInfoEditor>;
const Template: ComponentStory<typeof BusinessInfoEditor> = (args) =>
  <BusinessInfoEditor {...args} />;

export const Example = Template.bind({});
Example.args = {
  taxInput: {
    business: {
      name: "Bo & Co",
      industry: "Cody Monkeying",
      code: "WTF",
      accountingMethod: "Cash",
    },
  },
  setTaxInput: console.log,
};
