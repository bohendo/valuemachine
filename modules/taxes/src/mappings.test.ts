import { getLogger } from "@valuemachine/utils";
import * as pdf from "pdffiller";
import { expect } from "chai";

import testData from "../test.json";

import { fillForm } from "./pdf";

const log = getLogger("info", "Mappings");

describe("Tax Form Mappings", () => {

  it("should be ok", async () => {
    const form = "f1040";
    log.info(`${Object.keys(testData).length} entries of ${form} data`);
    // const dest = await fetchForm(
    // const fdfData = await mapForm(form);
    // log.info(fdfData, `${form} fdf data`);
    const res = await fillForm(form, testData[form], pdf);
    expect(res).to.be.ok;
  });

});

