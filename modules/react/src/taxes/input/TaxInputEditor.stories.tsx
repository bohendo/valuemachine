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
  taxInput: {
    personal: {
      firstName: "Batman",
      spouseFirstName: "Louis",
      city: "Metrocity",
    },
    business: {
      name: "Wayne & Co",
      city: "Gotham",
    },
    travel: [{
      enterDate: "2020-01-01",
      leaveDate: "2020-03-31",
      country: "USA",
    }],
    forms: {
      f1040: {
        Single: false,
        MarriedSeparate: true,
        L1: "1000000.01",
        L2b: "1.00",
        L3b: "1000.01",
        L4b: "1000 Shares of TSLA stock IBN: #312415",
      },
    },
  },
  setTaxInput: console.log,
};
