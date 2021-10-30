import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { TravelHistoryEditor } from "./TravelHistoryEditor";

export default {
  title: "TravelHistoryEditor",
  component: TravelHistoryEditor,
} as ComponentMeta<typeof TravelHistoryEditor>;
const Template: ComponentStory<typeof TravelHistoryEditor> = (args) =>
  <TravelHistoryEditor {...args} />;

export const Example = Template.bind({});
Example.args = {
  taxInput: {
    travel: [{
      enterDate: "2020-01-01",
      leaveDate: "2020-12-31",
      country: "IND",
      usaIncomeEarned: "0",
    }],
  },
  setTaxInput: console.log,
};
