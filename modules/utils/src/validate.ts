import Ajv from "ajv";
import addFormats from "ajv-formats";

export const ajv = addFormats(new Ajv()).addKeyword("kind").addKeyword("modifier");

export const formatErrors = errors => errors.map(error =>
  `${error.instancePath ? error.instancePath + ": " : ""}${error.message}`
).slice(0, 2).join(", ");

const isSameType = (actual: any, expected: string): boolean => {
  if (typeof actual === expected) {
    return true;
  }
  if (typeof actual === "object" && JSON.stringify(actual) === expected) {
    return true;
  }
  if (
    expected.endsWith("[]") &&
    typeof actual === "object" &&
    typeof actual.length === "number" &&
    actual.every(element => expected.startsWith(typeof element))
  ) {
    return true;
  }
  if (
    expected.endsWith("?") && (
      expected.startsWith(typeof actual) || typeof actual === "undefined"
    )
  ) {
    return true;
  }
  return false;
};

export const getPropertyError = (
  target: any,
  key: string,
  expected: string | string[],
): string | null => {
  if (typeof expected === "string") {
    if (!isSameType(target[key], expected)) {
      return `${key} is a ${typeof target[key]}, expected a ${expected}: ${
        JSON.stringify(target, null, 2)
      }`;
    }
  } else if (typeof expected === "object" && typeof expected.length === "number") {
    if (!expected.some(expectedType => isSameType(target[key], expectedType))) {
      return `${key} is a ${typeof target[key]}, expected one of ${expected}: ${
        JSON.stringify(target, null, 2)
      }`;
    }
  }
  return null;
};
