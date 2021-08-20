import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { AddressPorter } from "../AddressPorter";

import { addressBook } from "./constants";

export default { title: "AddressPorter", component: AddressPorter } as ComponentMeta<typeof AddressPorter>;
const Template: ComponentStory<typeof AddressPorter> = (args) => <AddressPorter {...args} />;

export const Example = Template.bind({});
Example.args = {
  addressBook,
  setAddressBookJson: console.log,
};


