import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { EventRow } from "../EventRow";

import { addressBook, vm } from "./constants";

export default {
  title: "EventRow",
  component: EventRow,
} as ComponentMeta<typeof EventRow>;
const Template: ComponentStory<typeof EventRow> = (args) => <EventRow {...args} />;

export const Example = Template.bind({});
Example.args = {
  addressBook,
  event: vm.getEvent(0),
};
