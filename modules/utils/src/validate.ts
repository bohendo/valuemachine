import Ajv from "ajv";
import addFormats from "ajv-formats";

export const ajv = addFormats(new Ajv()).addKeyword("kind").addKeyword("modifier");

export const formatErrors = errors => errors.map(error =>
  `${error.instancePath ? error.instancePath.replace(/^[/]/, "") + ": " : ""}${error.message}`
).slice(0, 2).join(", ");
