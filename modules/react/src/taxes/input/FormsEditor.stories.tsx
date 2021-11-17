import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { FormsEditor } from "./FormsEditor";

export default {
  title: "FormsEditor",
  component: FormsEditor,
} as ComponentMeta<typeof FormsEditor>;
const Template: ComponentStory<typeof FormsEditor> = (args) => <FormsEditor {...args} />;

export const Example = Template.bind({});
Example.args = {
  forms: {
    f1040: {
      L1: "100",
      L2b: "200",
    },
  },
  setForms: console.log,
};

