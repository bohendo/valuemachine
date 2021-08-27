import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { ChunkTable } from "../ChunkTable";

import { addressBook, vm } from "./constants";

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

