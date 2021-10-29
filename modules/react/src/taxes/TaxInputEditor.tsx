import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { TaxInput } from "@valuemachine/types";
import React, { useEffect, useState } from "react";

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
  const [newTaxInput, setNewTaxInput] = useState({} as any /* initialize form w empty strings */);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (!taxInput) setNewTaxInput({} as any);
    else setNewTaxInput(JSON.parse(JSON.stringify(taxInput)) as any);
  }, [taxInput]);

  const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setTab(newValue);
  };

  return (<>
    <Paper sx={{ p: 3 }}>

      <Tabs
        centered
        indicatorColor="secondary"
        onChange={handleTabChange}
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
          forms={newTaxInput?.forms || {}}
          setForms={forms => setNewTaxInput({ ...(newTaxInput || {}), forms })}
        />
      </div>

    </Paper>
  </>);
};
