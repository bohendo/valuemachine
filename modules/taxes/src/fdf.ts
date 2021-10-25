import { encode as iconv } from "iconv-lite";

// Inspired by & partially copy/pasted from:
// https://github.com/rhaseven7h/utf8-fdf-generator/commit/1e8cfea73a88b20a23493df0cdb874ae61e9cd37

export const toFdf = (data: { [key: string]: string; }): Buffer => {
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
