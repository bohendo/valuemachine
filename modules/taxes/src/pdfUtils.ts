import { getLogger } from "@valuemachine/utils";

import { toFdf } from "./fdf";

const log = getLogger("info", "Mappings");

type FdfJson = { [key: string]: string; };

export const getFieldNickname = (field) =>
  field.split(".").pop().replace(/]/g, "_").replace(/\[/g, "_")
    .replace(/_+/, "_").replace(/^_/, "").replace(/_$/, "");

export const getPdfUtils = (libs: { fs: any, execFile: any }) => {
  const { fs, execFile } = libs;
  if (!fs) throw new Error(`Node fs module must be injected`);
  if (!execFile) throw new Error(`Node execFile module must be injected`);

  const generateMapping = (sourceFile: string): Promise<FdfJson> => {
    return new Promise((res, rej) => {
      execFile("pdftk", [sourceFile, "dump_data_fields_utf8"], (error, stdout, stderr) => {
        if (stderr) log.error(stderr);
        if (error) return rej(error);
        res(stdout.toString().split("---").reduce((mapping, field) => {
          const fieldType = field.match(/FieldType: ([^\n]*)/)?.[1]?.trim() || "";
          const name = field.match(/FieldName: ([^\n]*)/)?.[1]?.trim() || "";
          if (!name || !fieldType) return mapping;
          if (fieldType !== "Text" && fieldType !== "Button") return mapping;
          return ({ ...mapping, [getFieldNickname(name)]: name });
        }, {} as FdfJson));
      });
    });
  };

  const fillForm = (
    srcPath: string,
    dstPath: string,
    fieldValues: FdfJson,
  ): Promise<string> => {
    //Generate the data from the field values.
    return new Promise((res, rej) => {

      execFile("pdftk", [srcPath, "dump_data_fields_utf8"], (err, stdout, stderr) => {
        if (err) { log.error(stderr); return rej(err); }
        const boolMap = stdout.toString().split("---").reduce((boolMap, field) => {
          const fieldType = field.match(/FieldType: ([^\n]*)/)?.[1]?.trim() || "";
          const fieldName = field.match(/FieldName: ([^\n]*)/)?.[1]?.trim() || "";
          const fieldFlag = field.match(/FieldStateOption: ([^\n]*)/)?.[1]?.trim();
          if (fieldType === "Button"){
            if (fieldFlag !== undefined) {
              return ({ ...boolMap, [fieldName]: fieldFlag });
            } else {
              log.warn(field, `No checkbox option for ${fieldName}`);
              return boolMap;
            }
          } else {
            return boolMap;
          }
        });

        const fdfValues = Object.entries(fieldValues).reduce((fdf, field) => {
          if (typeof field[1] === "boolean") {
            if (field[1] === true) {
              if (boolMap[field[0]] === undefined) {
                log.warn(`No bool map for ${field[0]}`);
                return { ...fdf, [field[0]]: "Yes" };
              } else {
                return { ...fdf, [field[0]]: boolMap[field[0]] };
              }
            } else {
              return { ...fdf, [field[0]]: "Off" };
            }
          } else {
            return { ...fdf, [field[0]]: field[1] || "" };
          }
        }, {});

        const tempFdfFile = `/tmp/tmp_${Math.random().toString(36).substring(8)}.fdf`;
        fs.writeFileSync(tempFdfFile, toFdf(fdfValues));

        execFile("pdftk", [srcPath, "fill_form", tempFdfFile, "output", dstPath], err => {
          if (err) return rej(err);
          //Delete the temporary fdf file.
          fs.unlink(tempFdfFile, (err) => err ? rej(err) : res(dstPath));
        });

      });

    });
  };

  return ({ fillForm, generateMapping });
};
