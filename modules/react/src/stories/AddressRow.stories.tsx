import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";
import {
  AddressCategories,
} from "@valuemachine/types";

import { AddressRow } from "../AddressRow";

export default { title: "AddressRow", component: AddressRow } as ComponentMeta<typeof AddressRow>;
const Template: ComponentStory<typeof AddressRow> = (args) => <AddressRow {...args} />;

export const Example = Template.bind({});
Example.args = {
  address: "Ethereum/0x1057Bea69c9ADD11c6e3dE296866AFf98366CFE3",
  editEntry: console.log,
  entry: {
    name: "bohendo.eth",
    address: "Ethereum/0x1057Bea69c9ADD11c6e3dE296866AFf98366CFE3",
    category: AddressCategories.Self,
  },
  otherAddresses: [],
};

