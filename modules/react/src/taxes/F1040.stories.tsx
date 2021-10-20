import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { F1040 } from "./F1040";

export default {
  title: "F1040",
  component: F1040,
} as ComponentMeta<typeof F1040>;
const Template: ComponentStory<typeof F1040> = (args) => <F1040 {...args} />;

export const Example = Template.bind({});
Example.args = {
  formData: {},
  setFormData: console.log,
};
