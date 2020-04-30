import { Log } from "@finances/types";

import { Forms } from "../types";

export const f8889 = (vmLogs: Log[], oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const { f8889 } = forms;

  return { ...forms, f8889 };
};
