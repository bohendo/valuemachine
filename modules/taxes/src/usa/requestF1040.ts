import { getLogger } from "@valuemachine/utils";
import axios from "axios";

import { Forms } from "./mappings";

const log = getLogger("info").child({ module: "requestF1040" });

export const requestF1040 = async (
  formData: Forms["f1040"],
  window: any,
) => {
  if (!formData) {
    log.warn(`Missing formData, not requesting f1040`);
    return;
  } else {
    axios({
      url: "/api/taxes/f1040",
      method: "post",
      responseType: "blob",
      data: { formData },
    }).then((response) => {
      const url = window.URL.createObjectURL(new window.Blob([response.data]));
      const link = window.document.createElement("a");
      link.href = url;
      link.setAttribute("download", "f1040.pdf");
      window.document.body.appendChild(link);
      link.click();
    }).catch(async () => {
      await new Promise(res => setTimeout(res, 2000));
    });
  }
};
