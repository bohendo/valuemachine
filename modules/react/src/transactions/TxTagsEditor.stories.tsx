import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { TxTagsEditor } from "./TxTagsEditor";

export default {
  title: "TxTagsEditor",
  component: TxTagsEditor,
} as ComponentMeta<typeof TxTagsEditor>;
const Template: ComponentStory<typeof TxTagsEditor> = (args) => <TxTagsEditor {...args} />;

export const Example = Template.bind({});
Example.args = {
  txTags: {},
  setTxTags: console.log,
};

