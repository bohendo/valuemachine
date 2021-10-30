import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { TaxInput } from "@valuemachine/types";
import React, { useState } from "react";

import { FormsEditor } from "./FormsEditor";
import { PersonalInfoEditor } from "./PersonalInfoEditor";
import { BusinessInfoEditor } from "./BusinessInfoEditor";
import { TravelHistoryEditor } from "./TravelHistoryEditor";

type TaxInputEditorProps = {
  taxInput?: TaxInput;
  setTaxInput?: (val: TaxInput) => void;
};
export const TaxInputEditor: React.FC<TaxInputEditorProps> = ({
  taxInput,
  setTaxInput,
}: TaxInputEditorProps) => {
  const [tab, setTab] = useState(0);

  return (<>
    <Paper sx={{ p: 3 }}>

      <Tabs
        centered
        indicatorColor="secondary"
        onChange={(evt, newVal) => setTab(newVal)}
        sx={{ m: 1 }}
        textColor="secondary"
        value={tab}
      >
        <Tab label="Personal Info"/>
        <Tab label="Business Info"/>
        <Tab label="Travel History"/>
        <Tab label="Form Fields"/>
      </Tabs>

      <Divider sx={{ mt: 2, mb: 1 }}/>

      <div hidden={tab !== 0}>
        <PersonalInfoEditor
          taxInput={taxInput}
          setTaxInput={setTaxInput}
        />
      </div>

      <div hidden={tab !== 1}>
        <BusinessInfoEditor
          taxInput={taxInput}
          setTaxInput={setTaxInput}
        />
      </div>

      <div hidden={tab !== 2}>
        <TravelHistoryEditor
          taxInput={taxInput}
          setTaxInput={setTaxInput}
        />
      </div>

      <div hidden={tab !== 3}>
        <FormsEditor
          forms={taxInput?.forms || {}}
          setForms={forms => setTaxInput?.({ ...(taxInput || {}), forms })}
        />
      </div>

    </Paper>
  </>);
};
