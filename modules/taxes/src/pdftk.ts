import { getLogger } from "@valuemachine/utils";
import { encode as iconv } from "iconv-lite";

import { Mapping } from "./types";
import { getMappingError } from "./utils";

// Inspired by & partially copy/pasted from:
// https://github.com/rhaseven7h/utf8-fdf-generator/commit/1e8cfea73a88b20a23493df0cdb874ae61e9cd37
type FdfJson = { [key: string]: string; };
export const toFdf = (data: FdfJson): Buffer => {
  const encode = (val: string): Buffer => iconv(val.toString(), "UTF-8");
  return Buffer.concat([
    // Header
    Buffer.from("%FDF-1.2\n"),
    Buffer.from(
      (String.fromCharCode(226)) + (String.fromCharCode(227)) +
      (String.fromCharCode(207)) + (String.fromCharCode(211)) + "\n"
    ),
    Buffer.from("1 0 obj \n"),
    Buffer.from("<<\n"),
    Buffer.from("/FDF \n"),
    Buffer.from("<<\n"),
    Buffer.from("/Fields [\n"),
    // Body
    Object.entries(data).reduce((body, entry) => {
      const [key, value] = entry;
      return Buffer.concat([ body, Buffer.concat([
        Buffer.from("<<\n"),
        Buffer.from("/T ("),
        encode(key),
        Buffer.from(")\n"),
        Buffer.from("/V ("),
        encode(value),
        Buffer.from(")\n"),
        Buffer.from(">>\n"),
      ]) ]);
    }, Buffer.from([])),
    // Footer
    Buffer.from("]\n"),
    Buffer.from(">>\n"),
    Buffer.from(">>\n"),
    Buffer.from("endobj \n"),
    Buffer.from("trailer\n"),
    Buffer.from("\n"),
    Buffer.from("<<\n"),
    Buffer.from("/Root 1 0 R\n"),
    Buffer.from(">>\n"),
    Buffer.from("%%EOF\n"),
  ]);
};

export const getDefaultNickname = (index: number, fieldName: string): string =>
  `${index}_${fieldName.split(".").pop().split("[").shift()}`;

export const getPdftk = (libs: { fs: any, execFile: any }) => {
  const { fs, execFile } = libs;
  if (!fs) throw new Error(`Node fs module must be injected`);
  if (!execFile) throw new Error(`Node execFile module must be injected`);
  const log = getLogger("info", "pdftk");

  const getMapping = (srcFilepath: string): Promise<Mapping> =>
    new Promise((res, rej) => {
      if (!fs.existsSync(srcFilepath)) return rej(new Error(`No file exists at ${srcFilepath}`));
      execFile("pdftk", [srcFilepath, "dump_data_fields_utf8"], (error, stdout, stderr) => {
        if (stderr) log.error(stderr);
        if (error) return rej(new Error(error));
        const mapping = stdout.toString().split("---").reduce((mapping, field, index) => {
          const fieldType = field.match(/FieldType: ([^\n]*)/)?.[1]?.trim() || "";
          const fieldName = field.match(/FieldName: ([^\n]*)/)?.[1]?.trim() || "";
          if (!fieldName || !fieldType) return mapping;
          const nickname = getDefaultNickname(index, fieldName);
          if (fieldType === "Text") {
            return [...mapping, {
              fieldName,
              nickname,
            }];
          } else if (fieldType === "Button") {
            const checkmark = field
              .match(/FieldStateOption: [^\n]*/g)
              .filter(s => !s.endsWith(" Off"))[0]
              ?.split(":").pop()
              ?.trim() || "Yes";
            return [...mapping, {
              fieldName,
              nickname,
              checkmark,
            }];
          } else {
            return mapping;
          }
        }, [] as Mapping);
        const mappingError = getMappingError(mapping);
        return mappingError
          ? rej(new Error(`${srcFilepath} default mapping: ${mappingError}`))
          : res(mapping);
      });
    });

  const fill = (
    srcPath: string,
    dstPath: string,
    fieldValues: FdfJson,
  ): Promise<string> => {
    //Generate the data from the field values.
    return new Promise((res, rej) => {
      execFile("pdftk", [srcPath, "dump_data_fields_utf8"], (err, stdout, stderr) => {
        if (err) { log.error(stderr); return rej(new Error(err)); }
        const fdfValues = Object.entries(fieldValues).reduce((fdf, field) => {
          if (typeof field[1] === "boolean") {
            log.warn(`Boolean value should have been translated to a checkmark by now..`);
            return fdf;
          } else {
            return { ...fdf, [field[0]]: field[1] || "" };
          }
        }, {});
        const tempFdfFile = `/tmp/tmp_${Math.random().toString(36).substring(8)}.fdf`;
        fs.writeFileSync(tempFdfFile, toFdf(fdfValues));
        execFile("pdftk", [srcPath, "fill_form", tempFdfFile, "output", dstPath], err => {
          if (err) return rej(new Error(err));
          //Delete the temporary fdf file.
          fs.unlink(tempFdfFile, (err) => err ? rej(new Error(err)) : res(dstPath));
        });
      });
    });
  };

  const cat = async (
    pagePaths: string[],
    outputPath: string,
  ): Promise<string> => {
    const args = [...pagePaths, "cat", "output", outputPath];
    return new Promise((res, rej) => {
      execFile("pdftk", args, (err) => {
        if (err) rej(new Error(err));
        res(outputPath);
      });
    });
  };

  return ({ getMapping, fill, cat });
};
