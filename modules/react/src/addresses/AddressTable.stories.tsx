import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { addressBook } from "../constants";

import { AddressTable } from "./AddressTable";

export default { title: "AddressTable", component: AddressTable } as ComponentMeta<typeof AddressTable>;
const Template: ComponentStory<typeof AddressTable> = (args) => <AddressTable {...args} />;

export const Example = Template.bind({});
Example.args = {
  addressBook,
  setAddressBookJson: console.log,
};

