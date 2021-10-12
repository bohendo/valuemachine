import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { TimestampInput } from "./TimestampInput";

export default { title: "TimestampInput", component: TimestampInput } as ComponentMeta<typeof TimestampInput>;
const Template: ComponentStory<typeof TimestampInput> = (args) => <TimestampInput {...args} />;

export const Example = Template.bind({});
Example.args = {
  label: "Which Timestamp?",
  helperText: "Custom helper text",
  setTimestamp: console.log,
};
