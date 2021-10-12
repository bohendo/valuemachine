import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { SelectOne } from "./SelectOne";

export default { title: "SelectOne", component: SelectOne } as ComponentMeta<typeof SelectOne>;
const Template: ComponentStory<typeof SelectOne> = (args) => <SelectOne {...args} />;

export const Example = Template.bind({});
Example.args = {
  label: "Which One?",
  selection: "",
  choices: ["This One", "That One"],
  setSelection: console.log,
};
