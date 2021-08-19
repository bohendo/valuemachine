import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { HexString } from "../HexString";

export default { title: "HexString", component: HexString } as ComponentMeta<typeof HexString>;
const Template: ComponentStory<typeof HexString> = (args) => <HexString {...args} />;

export const Address = Template.bind({});
Address.args = {
  value: "evm:1:0x1057Bea69c9ADD11c6e3dE296866AFf98366CFE3",
  display: "bohendo.eth",
};

export const Bytes32 = Template.bind({});
Bytes32.args = {
  display: "",
  value: "0x1fe21fc87ac66fce26d0c45ab3d88ed450133b55ab664ec2771142e700aabca2",
};
