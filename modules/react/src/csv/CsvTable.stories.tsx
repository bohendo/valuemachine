import React from "react";
import { ComponentStory, ComponentMeta } from "@storybook/react";

import { csvFiles } from "../constants";

import { CsvTable } from "./CsvTable";

export default { title: "CsvTable", component: CsvTable } as ComponentMeta<typeof CsvTable>;
const Template: ComponentStory<typeof CsvTable> = (args) => <CsvTable {...args} />;

export const Example = Template.bind({});
Example.args = {
  csvFiles,
  setCsvFiles: console.log,
};


