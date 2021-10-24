import { Event } from "@finances/types";

import { Forms } from "../types";

export const f1040 = (vmEvents: Event[], oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const { f1040 } = forms;

  return { ...forms, f1040 };
};
