import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { DateInput } from "../DateInput";

export default { title: "DateInput", component: DateInput } as ComponentMeta<typeof DateInput>;
const Template: ComponentStory<typeof DateInput> = (args) => <DateInput {...args} />;

export const Example = Template.bind({});
Example.args = {
  label: "Which Date?",
  helperText: "Custom helper text",
  setDate: console.log,
};
