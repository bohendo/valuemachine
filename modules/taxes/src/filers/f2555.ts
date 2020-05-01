import { Log } from "@finances/types";

import { Forms } from "../types";

export const f2555 = (vmLogs: Log[], oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const { f2555 } = forms;


  return { ...forms, f2555 };
};
