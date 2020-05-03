import { Log } from "@finances/types";
import { ContextLogger, LevelLogger, math } from "@finances/utils";

import { env } from "../env";
import { Forms } from "../types";

export const f2555 = (vmLogs: Log[], oldForms: Forms): Forms => {
  const log = new ContextLogger("f2555", new LevelLogger(env.logLevel));
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const { f2555 } = forms;

  f2555.FullName = `${forms.f1040.FirstNameMI} ${forms.f1040.LastName}`;
  f2555.SSN = forms.f1040.SocialSecurityNumber;

  log.info(`Foreign earned income exclusion: ${f2555.L42}`);

  f2555.L43 = math.add([f2555.L36, f2555.L42]);

  return { ...forms, f2555 };
};
