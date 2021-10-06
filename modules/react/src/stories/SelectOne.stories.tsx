import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { SelectOne } from "../SelectOne";

export default { title: "SelectOne", component: SelectOne } as ComponentMeta<typeof SelectOne>;
const Template: ComponentStory<typeof SelectOne> = (args) => <SelectOne {...args} />;

let selection = "";

export const Example = Template.bind({});
Example.args = {
  id: "select-one",
  label: "Which One?",
  selection,
  options: ["This One", "That One"],
  setSelection: val => {
    selection = val;
    console.log(selection);
  },
};
