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
      country: "IND",
      enterDate: "2020-01-01",
      leaveDate: "2020-12-31",
    }],
  },
  setTaxInput: console.log,
};
