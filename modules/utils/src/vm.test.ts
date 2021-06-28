import { getValueMachineError } from "./vm";
import { expect } from "./testUtils";

const validVM = {
  date: new Date(0).toISOString(),
  events: [],
  chunks: [],
};

describe("ValueMachine", () => {
  it("should return no errors if json is valid", async () => {
    expect(getValueMachineError(validVM)).to.be.null;
  });

  it("should return an error if the json is invalid", async () => {
    expect(getValueMachineError({ ...validVM, events: "oops" })).to.be.a("string");
  });
});

