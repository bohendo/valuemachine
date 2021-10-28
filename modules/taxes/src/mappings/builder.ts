// NOTE: this file is for dev-use only & shouldn't be included in the prod dist bundle
// These tools can be used to build new form mappings or verify that current ones are valid
import { getLogger } from "@valuemachine/utils";
import { compile } from "json-schema-to-typescript";

import { syncMapping } from "../utils";

import { MappingArchive } from ".";

const log = getLogger("info", "Builder");

export const buildMappingFile = async (year, form, defaultMapping): Promise<string> => {
  const mapping = MappingArchive[year]?.[form] || {};
  syncMapping(form, defaultMapping, mapping);
  const title = form.toUpperCase();
  const ts = new Promise(res => {
    const schema = defaultMapping.reduce((schema, entry) => ({
      ...schema,
      properties: {
        ...schema.properties,
        [mapping.find(e => e.fieldName === entry.fieldName)?.nickname || entry.nickname]: {
          type: entry.checkmark ? "boolean" : "string",
        },
      },
    }), {
      additionalProperties: false,
      title,
      properties: {},
    });
    compile(schema, title, {
      bannerComment: "// This interface was automatically generated from the above schema",
    }).then(ts => {
      log.info(`Got interface w ${ts.split("\n").length - 5} props from ${year} ${form} mapping`);
      res(ts);
    });
  });
  const mappingFileContent = "/* eslint-disable */\n\n"
    + `export const ${form} = [\n  `
    + mapping.map(e => JSON.stringify(e)).join(`,\n  `)
    + "\n];\n\n"
    + (await ts);
  return mappingFileContent;
};
