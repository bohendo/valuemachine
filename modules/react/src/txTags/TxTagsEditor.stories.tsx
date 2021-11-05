import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { txTags } from "../constants";

import { TxTagsEditor } from "./TxTagsEditor";

export default {
  title: "TxTagsEditor",
  component: TxTagsEditor,
} as ComponentMeta<typeof TxTagsEditor>;
const Template: ComponentStory<typeof TxTagsEditor> = (args) => <TxTagsEditor {...args} />;

export const NewTag = Template.bind({});
NewTag.args = {
  txTags,
  setTxTags: console.log,
};

export const EditTag = Template.bind({});
EditTag.args = {
  txTags,
  setTxTags: console.log,
  txId: "Test/0x0000000000000000000000000000000000000000000000000000000000000000/1",
};
