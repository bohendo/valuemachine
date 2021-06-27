import { Type } from "@sinclair/typebox";

export const enumToSchema = (enumObj) =>
  Type.Union(Object.keys(enumObj).map(key => Type.Literal(key)));
//  Type.KeyOf(Type.Object(enumObj));
