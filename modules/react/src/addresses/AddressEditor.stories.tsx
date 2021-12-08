import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";
import { AddressCategories } from "@valuemachine/transactions";

import { AddressEditor } from "./AddressEditor";

export default { title: "AddressEditor", component: AddressEditor } as ComponentMeta<typeof AddressEditor>;
const Template: ComponentStory<typeof AddressEditor> = (args) => <AddressEditor {...args} />;

export const Insert = Template.bind({});
Insert.args = {
  entry: {
    address: "",
    name: "",
  },
  setEntry: console.log,
  addresses: [],
};

export const Modify = Template.bind({});
Modify.args = {
  entry: {
    address: "Bro",
    category: AddressCategories.Self,
    name: "0x557f0e214c8e8607a2c1E910802ACA23c6C0E72e",
  },
  setEntry: console.log,
  addresses: [],
};
