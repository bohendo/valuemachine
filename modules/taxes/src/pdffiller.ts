import { toFdf } from "./fdf";

type FdfJson = { [key: string]: string; };

export const getPdfUtils = (libs: { fs: any, execFile: any, Iconv: any }) => {
  const { fs, execFile, Iconv } = libs;
  if (!fs) throw new Error(`Node fs module must be injected`);
  if (!execFile) throw new Error(`Node execFile module must be injected`);
  if (!Iconv) throw new Error(`Iconv binary module must be injected`);

  const generateMapping = (sourceFile: string): Promise<FdfJson> => {
    const getNickname = (field) => field.split(".").pop().replace(/]/g, "").replace(/\[/g, "_");
    return new Promise((res, rej) => {
      execFile("pdftk", [sourceFile, "dump_data_fields_utf8"], (error, stdout, stderr) => {
        if (stderr) console.error(stderr);
        if (error) return rej(error);
        res(stdout.toString().split("---").slice(1).reduce((mapping, field) => {
          const fieldType = field.match(/FieldType: ([^\n]*)/)[1].trim() || "";
          const name = field.match(/FieldName: ([^\n]*)/)[1].trim() || "";
          if (fieldType !== "Text" && fieldType !== "Button") return mapping;
          if (!name) return mapping;
          return ({ ...mapping, [getNickname(name)]: name });
        }, {} as FdfJson));
      });
    });
  };

  const fillForm = (
    sourceFile: string,
    destinationFile: string,
    fieldValues: FdfJson,
  ): Promise<string> => {
    //Generate the data from the field values.
    const tempFdfFile = `/tmp/tmp_${Math.random().toString(36).substring(8)}.fdf`;
    fs.writeFileSync(tempFdfFile, toFdf(fieldValues));
    const args = [sourceFile, "fill_form", tempFdfFile, "output", destinationFile];
    return new Promise((res, rej) => {
      execFile("pdftk", args, (error, _stdout, _stderr) => {
        if (error) return rej(error);
        //Delete the temporary fdf file.
        fs.unlink(tempFdfFile, (err) => err ? rej(err) : res(destinationFile));
      } );
    });
  };

  return ({ fillForm, generateMapping });
};
