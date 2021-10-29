import { expect } from "chai";

import { getMappingError, getTaxInputError } from "./taxes";

describe("Tax Validators", () => {

  it("should return no errors if mapping is valid", async () => {
    expect(getMappingError([{
      nickname: "L1",
      fieldName: "topmostSubform[0].Page1[0].f1_01[0]",
    }])).to.equal("");
  });

  it("should return an error if mapping is invalid", async () => {
    expect(getMappingError([{
      nicname: "L1", // misspelled keyname
      fieldName: "topmostSubform[0].Page1[0].f1_01[0]",
    }])).to.include("nickname");
  });

  it("should return an error if the mapping has duplicate nicknames", async () => {
    expect(getMappingError([{
      nickname: "L1",
      fieldName: "topmostSubform[0].Page1[0].f1_01[0]",
    }, {
      nickname: "L1",
      fieldName: "topmostSubform[0].Page1[0].f1_02[0]",
    }])).to.include("nickname");
  });

  it("should return an error if the mapping has duplicate fieldNames", async () => {
    expect(getMappingError([{
      nickname: "L1",
      fieldName: "topmostSubform[0].Page1[0].f1_01[0]",
    }, {
      nickname: "L2",
      fieldName: "topmostSubform[0].Page1[0].f1_01[0]",
    }])).to.include("fieldName");
  });

  it("should return no errors if tax input is valid", async () => {
    expect(getTaxInputError({
      personal: {
        firstName: "Bo"
      },
    })).to.equal("");
  });

  it("should return an error if tax input is invalid", async () => {
    expect(getTaxInputError({
      invalidKey: "Bo"
    })).to.include("additional properties");
  });

});


