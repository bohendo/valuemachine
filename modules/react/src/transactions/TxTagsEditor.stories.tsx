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
  txTags: {
    ["Ethereum/0xdd6beaa1dfed839747217c721696d81984e2507ef973cd3efb9e0cfe486a0b80"]: {
      description: "Oops I committed another felony",
    },
    ["Ethereum/0x5e70e647a5dee8cc7eaddc302f2a7501e29ed00d325eaec85a3bde5c02abf1ec"]: {
      description: "Oops I committed a felony",
      multiplier: "2.71",
    },
  },
  setTxTags: console.log,
};

