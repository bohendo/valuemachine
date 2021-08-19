import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";
import { getAddressBook } from "@valuemachine/transactions";

import { AddressTable } from "../AddressTable";

export default { title: "AddressTable", component: AddressTable } as ComponentMeta<typeof AddressTable>;
const Template: ComponentStory<typeof AddressTable> = (args) => <AddressTable {...args} />;

export const Example = Template.bind({});
Example.args = {
  addressBook: getAddressBook(),
  setAddressBookJson: console.log,
};

