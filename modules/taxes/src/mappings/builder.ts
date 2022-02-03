// NOTE: this file is for dev-use only & shouldn't be included in the prod dist bundle
// These tools can be used to build new form mappings or verify that current ones are valid
import { Logger, TaxYear } from "@valuemachine/types";
import { getLogger } from "@valuemachine/utils";
import { compile } from "json-schema-to-typescript";

import { getDefaultNickname } from "../pdftk";
import { getMappingError, splitTaxYear } from "../utils";
import { Mapping } from "../types";

import { MappingArchive } from ".";

export const buildMappingFile = async (
  taxYear: TaxYear,
  form: string,
  defaultMapping: Mapping,
  logger?: Logger,
): Promise<string> => {
  const log = (logger || getLogger()).child({ name: "BuildMappings" });
  const mapping = MappingArchive[taxYear]?.[form] || [];
  const [guard, year] = splitTaxYear(taxYear);
  const lastTaxYear = `${guard}${parseInt(year) - 1}`;
  const prevMapping = MappingArchive[lastTaxYear]?.[form] || [];

  // Add any fields from the master to the slave
  for (const master of defaultMapping) {
    const slave = mapping.find(e => e.fieldName === master.fieldName);
    // Make sure all fields except nickname equal the values from the empty pdf
    if (!slave) {
      log.warn(`Adding new entry for ${master.fieldName} to ${form} mappings`);
      mapping.push({
        nickname: (prevMapping?.[master.fieldName]?.nickname)
          ? prevMapping[master.fieldName].nickname
          : master.nickname,
        fieldName: master.fieldName,
        checkmark: master.checkmark,
      });
    } else if (master.checkmark) {
      slave.checkmark = master.checkmark;
    }
  }

  // Remove any fields from the slave that don't exist on the master
  for (const i of mapping.map((_, i) => i)) {
    const slave = mapping[i];
    if ((slave as any).fieldType) delete (slave as any).fieldType; // depreciated field
    if (!defaultMapping.find(master => master.fieldName === slave.fieldName)) {
      log.warn(`Removing ${slave.nickname} from ${form} mappings`);
      mapping.splice(i, 1);
    }
  }

  // Replace any default nicknames on the slave if a nickname existed on last year's master
  for (const i of mapping.map((_, i) => i)) {
    const slave = mapping[i];
    const master = prevMapping?.find(m => m.fieldName === slave.fieldName);
    const defaultNickname = getDefaultNickname(i + 1, slave.fieldName);
    log.info(`slave nickname: ${slave.nickname} vs default nickname: ${defaultNickname}`);
    if (slave.nickname === defaultNickname && master?.nickname) {
      log.warn(`Replacing nickname of ${slave.nickname} with last year's ${master.nickname}`);
      slave.nickname = master.nickname;
    }
  }

  const error = getMappingError(mapping);
  if (error) throw new Error(`${taxYear} ${form}: ${error}`);
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
      log.info(`Got interface w ${ts.split("\n").length - 5} props from ${taxYear} ${form} mapping`);
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
