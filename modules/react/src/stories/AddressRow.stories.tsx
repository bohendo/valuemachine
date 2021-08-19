import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { AddressRow } from "../AddressRow";

export default { title: "AddressRow", component: AddressRow } as ComponentMeta<typeof AddressRow>;
const Template: ComponentStory<typeof AddressRow> = (args) => <AddressRow {...args} />;

export const Example = Template.bind({});
Example.args = {
  entry: {
    name: "bohendo.eth",
    address: "evm:1:0x1057Bea69c9ADD11c6e3dE296866AFf98366CFE3",
  },
  setEntry: console.log,
  addresses: [],
};

