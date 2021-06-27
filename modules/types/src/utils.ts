import { Type } from "@sinclair/typebox";

export const enumToSchema = (enumObj: { [key: string]: string }) => Type.Union(
  Object.keys(enumObj).map(key => Type.Literal(key))
);
