import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { PersonalInfoEditor } from "./PersonalInfoEditor";

export default {
  title: "PersonalInfoEditor",
  component: PersonalInfoEditor,
} as ComponentMeta<typeof PersonalInfoEditor>;
const Template: ComponentStory<typeof PersonalInfoEditor> = (args) =>
  <PersonalInfoEditor {...args} />;

export const Example = Template.bind({});
Example.args = {
  taxInput: {
    personal: {
      firstName: "Batman",
      spouseFirstName: "Louis",
      city: "Metrocity",
    },
  },
  setTaxInput: console.log,
};
