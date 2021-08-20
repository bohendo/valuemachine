import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { CsvPorter } from "../CsvPorter";

import { csvFiles } from "./constants";

export default { title: "CsvPorter", component: CsvPorter } as ComponentMeta<typeof CsvPorter>;
const Template: ComponentStory<typeof CsvPorter> = (args) => <CsvPorter {...args} />;

export const Example = Template.bind({});
Example.args = {
  csvFiles,
  setCsvFiles: console.log,
};
