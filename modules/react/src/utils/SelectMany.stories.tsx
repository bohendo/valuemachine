import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { SelectMany } from "./SelectMany";

export default { title: "SelectMany", component: SelectMany } as ComponentMeta<typeof SelectMany>;
const Template: ComponentStory<typeof SelectMany> = (args) => <SelectMany {...args} />;

export const Example = Template.bind({});
Example.args = {
  label: "Which Ones?",
  selection: "",
  choices: ["This One", "That One"],
  setSelection: console.log,
};
