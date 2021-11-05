import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { txTags } from "../constants";

import { TxTagsPorter } from "./TxTagsPorter";

export default { title: "TxTagsPorter", component: TxTagsPorter } as ComponentMeta<typeof TxTagsPorter>;
const Template: ComponentStory<typeof TxTagsPorter> = (args) =>
  <TxTagsPorter {...args} />;

export const Example = Template.bind({});
Example.args = {
  txTags,
  setTxTags: console.log,
};
