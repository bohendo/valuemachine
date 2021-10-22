import { expect } from "chai";

import { commify } from "./math";

describe("Math", () => {

  it("should commify properly", async () => {
    expect(commify("100000000")).to.equal("100,000,000.0");
    expect(commify("-100000000")).to.equal("-100,000,000.0");
    expect(commify("100000000", "INR")).to.equal("10,00,00,000.00");
    expect(commify("-100000000", "INR")).to.equal("-10,00,00,000.00");
    expect(commify("-250.573664391572232596", "INR")).to.equal("-250.57");
  });

});
