import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { addressBook } from "../constants";

import { AddressPorter } from "./AddressPorter";

export default { title: "AddressPorter", component: AddressPorter } as ComponentMeta<typeof AddressPorter>;
const Template: ComponentStory<typeof AddressPorter> = (args) => <AddressPorter {...args} />;

export const Example = Template.bind({});
Example.args = {
  addressBook: addressBook.json,
  setAddressBookJson: console.log,
};
