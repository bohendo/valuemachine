import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { AddressEditor } from "../AddressEditor";

export default { title: "AddressEditor", component: AddressEditor } as ComponentMeta<typeof AddressEditor>;
const Template: ComponentStory<typeof AddressEditor> = (args) => <AddressEditor {...args} />;

export const Example = Template.bind({});
Example.args = {
  entry: {},
  setEntry: console.log,
  addresses: [],
};

