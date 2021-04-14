import { math } from "@finances/utils";
import { expect } from "chai";

import { getIncomeTax } from "./utils";

describe("Tax Utils", () => {
  it(`Calculate proper income tax`, async () => {
    // expected values come from tax table in i1040
    expect(math.round(getIncomeTax("0", "single"), 0)).to.eq("0");
    expect(math.round(getIncomeTax("50025", "single"), 0)).to.eq("6864");
    expect(math.round(getIncomeTax("50025", "joint"), 0)).to.eq("5615");
    expect(math.round(getIncomeTax("50025", "head"), 0)).to.eq("5726");
    expect(math.round(getIncomeTax("95025", "single"), 0)).to.eq("16981");
    expect(math.round(getIncomeTax("95025", "joint"), 0)).to.eq("12623");
    expect(math.round(getIncomeTax("95025", "head"), 0)).to.eq("15560");
  });
});
