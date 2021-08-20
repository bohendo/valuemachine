import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { EventTable } from "../EventTable";

import { addressBook, vm } from "./constants";

export default {
  title: "EventTable",
  component: EventTable,
} as ComponentMeta<typeof EventTable>;
const Template: ComponentStory<typeof EventTable> = (args) => <EventTable {...args} />;

export const Example = Template.bind({});
Example.args = {
  addressBook,
  vm,
};

