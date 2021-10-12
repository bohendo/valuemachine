import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { addressBook, vm } from "../constants";

import { ChunkTable } from "./ChunkTable";

export default {
  title: "ChunkTable",
  component: ChunkTable,
} as ComponentMeta<typeof ChunkTable>;
const Template: ComponentStory<typeof ChunkTable> = (args) => <ChunkTable {...args} />;

export const Example = Template.bind({});
Example.args = {
  addressBook,
  vm,
};

