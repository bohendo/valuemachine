import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { DateTimeInput } from "./DateTimeInput";

export default { title: "DateTimeInput", component: DateTimeInput } as ComponentMeta<typeof DateTimeInput>;
const Template: ComponentStory<typeof DateTimeInput> = (args) => <DateTimeInput {...args} />;

export const Example = Template.bind({});
Example.args = {
  label: "Which DateTime?",
  helperText: "Custom helper text",
  setDateTime: console.log,
};
