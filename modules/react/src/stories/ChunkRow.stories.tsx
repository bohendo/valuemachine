import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { ChunkRow } from "../ChunkRow";

import { addressBook, vm } from "./constants";

export default {
  title: "ChunkRow",
  component: ChunkRow,
} as ComponentMeta<typeof ChunkRow>;
const Template: ComponentStory<typeof ChunkRow> = (args) => <ChunkRow {...args} />;

export const Example = Template.bind({});
Example.args = {
  addressBook,
  chunk: vm.getChunk(0),
};
