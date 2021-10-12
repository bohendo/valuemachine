import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { TransactionEditor } from "./TransactionEditor";

export default {
  title: "TransactionEditor",
  component: TransactionEditor,
} as ComponentMeta<typeof TransactionEditor>;
const Template: ComponentStory<typeof TransactionEditor> = (args) =>
  <TransactionEditor {...args} />;

export const Example = Template.bind({});
Example.args = {
  tx: {
    apps: [],
    date: "",
    index: 0,
    method: "",
    sources: [],
    transfers: [],
    uuid: "",
  },
  setTx: console.log,
};

