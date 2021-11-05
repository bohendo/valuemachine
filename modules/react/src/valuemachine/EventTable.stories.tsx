import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { addressBook, txTags, vm } from "../constants";

import { EventTable } from "./EventTable";

export default {
  title: "EventTable",
  component: EventTable,
} as ComponentMeta<typeof EventTable>;
const Template: ComponentStory<typeof EventTable> = (args) => <EventTable {...args} />;

export const Example = Template.bind({});
Example.args = {
  addressBook,
  txTags,
  setTxTags: console.log,
  vm,
};

