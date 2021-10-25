
export const generateFdf = (data: any, filename: string, libs: { fs: any, Iconv: any }) => {
  const iconv = new libs.Iconv("UTF-8", "UTF-16");

  let header = Buffer.from([]);
  header = Buffer.concat([ header, new Buffer("%FDF-1.2\n") ]);
  header = Buffer.concat([ header, new Buffer((String.fromCharCode(226)) + (String.fromCharCode(227)) + (String.fromCharCode(207)) + (String.fromCharCode(211)) + "\n") ]);
  header = Buffer.concat([ header, new Buffer("1 0 obj \n") ]);
  header = Buffer.concat([ header, new Buffer("<<\n") ]);
  header = Buffer.concat([ header, new Buffer("/FDF \n") ]);
  header = Buffer.concat([ header, new Buffer("<<\n") ]);
  header = Buffer.concat([ header, new Buffer("/Fields [\n") ]);

  let footer = Buffer.from([]);
  footer = Buffer.concat([ footer, new Buffer("]\n") ]);
  footer = Buffer.concat([ footer, new Buffer(">>\n") ]);
  footer = Buffer.concat([ footer, new Buffer(">>\n") ]);
  footer = Buffer.concat([ footer, new Buffer("endobj \n") ]);
  footer = Buffer.concat([ footer, new Buffer("trailer\n") ]);
  footer = Buffer.concat([ footer, new Buffer("\n") ]);
  footer = Buffer.concat([ footer, new Buffer("<<\n") ]);
  footer = Buffer.concat([ footer, new Buffer("/Root 1 0 R\n") ]);
  footer = Buffer.concat([ footer, new Buffer(">>\n") ]);
  footer = Buffer.concat([ footer, new Buffer("%%EOF\n") ]);

  const dataKeys = Object.keys(data);

  let body = new Buffer([]);

  for(let i=0; i<dataKeys.length; i++) {
    const name = dataKeys[i];
    const value = data[name];

    body = Buffer.concat([ body, new Buffer("<<\n") ]);
    body = Buffer.concat([ body, new Buffer("/T (") ]);
    body = Buffer.concat([ body, iconv.convert(name.toString()) ]);
    body = Buffer.concat([ body, new Buffer(")\n") ]);
    body = Buffer.concat([ body, new Buffer("/V (") ]);
    body = Buffer.concat([ body, iconv.convert(value.toString()) ]);
    body = Buffer.concat([ body, new Buffer(")\n") ]);
    body = Buffer.concat([ body, new Buffer(">>\n") ]);
  }

  libs.fs.writeFileSync(filename, Buffer.concat([ header, body, footer ]));
};
