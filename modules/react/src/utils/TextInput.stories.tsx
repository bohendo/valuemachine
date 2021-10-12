import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { TextInput } from "./TextInput";

export default { title: "TextInput", component: TextInput } as ComponentMeta<typeof TextInput>;
const Template: ComponentStory<typeof TextInput> = (args) => <TextInput {...args} />;

export const Example = Template.bind({});
Example.args = {
  label: "Which Text?",
  helperText: "Custom helper text",
  setText: console.log,
  getError: () => "Oh no",
};
