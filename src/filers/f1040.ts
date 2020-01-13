import { InputData, Forms } from '../types';
import { add, gt, lt, eq, round, sub } from '../utils';

export const f1040 = (input: InputData, oldForms: Forms): Forms => {
  const forms = JSON.parse(JSON.stringify(oldForms)) as Forms;
  const f1040 = forms.f1040 && forms.f1040[0] ? forms.f1040[0] : {};
  const f1040s2 = forms.f1040s2 && forms.f1040s2[0] ? forms.f1040s2[0] : {};
  const f1040s3 = forms.f1040s3 && forms.f1040s3[0] ? forms.f1040s3[0] : {};

  f1040[input.FilingStatus] = true;
  f1040.f1_02 = `${input.FirstName} ${input.MiddleInitial}`;
  f1040.f1_03 = `${input.LastName}`;
  f1040.f1_04 = input.SocialSecurityNumber;
  if (f1040["MarriedFilingJointly"] = true) {
    f1040.f1_05 = `${input.SpouseFirstName} ${input.SpouseMiddleInitial}`;
    f1040.f1_06 = `${input.SpouseLastName}`;
    f1040.f1_07 = input.SpouseSocialSecurityNumber;
  }
  f1040.f1_08 = input.StreetAddress;
  f1040.f1_09 = input.AptNumber;
  f1040.f1_10 = input.CityStateZip;
  f1040.f1_11 = input.ForeignCountry;
  f1040.f1_12 = input.ForeignState;
  f1040.f1_13 = input.ForeignPostalCode;

  const start = [14, 12];
  let i = 0;
  let j = 0
  for (const dependent of input.Dependents) {
    if (i === 26) break;
    f1040[`f1_${start[0] + i++}`] = `${dependent.FirstName} ${dependent.LastName}`;
    f1040[`f1_${start[0] + i++}`] = dependent.SSN;
    f1040[`f1_${start[0] + i++}`] = dependent.Relationship;
    f1040[`c1_${start[1] + j++}_0`] = dependent.ChildTaxCredit;
    f1040[`c1_${start[1] + j++}_0`] = dependent.CreditForOther;
  }

  f1040.L7b = round(add([
    f1040.L1, f1040.L2b, f1040.L3b, f1040.L4b,
    f1040.L4d, f1040.L5b, f1040.L6, f1040.L7a,
  ]));

  f1040.L7b = round(add([
    f1040.L1, f1040.L2b, f1040.L3b, f1040.L4b,
    f1040.L4d, f1040.L5b, f1040.L6, f1040.L7a,
  ]));


  f1040.L8b = round(sub(f1040.L7b, f1040.L8a));

  f1040.L11a = round(add([f1040.L9, f1040.L10]));

  const taxableIncome = add([f1040.L8b, f1040.L11a])
  f1040.L11b = round(gt(taxableIncome, "0") ? taxableIncome : "0");

  f1040.L12b = round(add([f1040s2.L3, f1040.L12a]));

  f1040.L13b = round(add([f1040s3.L7, f1040.L13a]));

  const taxesSoFar = sub(f1040.L12b, f1040.L13b)
  f1040.L14 = round(gt(taxesSoFar, "0") ? taxesSoFar : "0");

  f1040.L16 = round(add([f1040.L14, f1040.L15]));

  f1040.L18e = round(add([f1040.L18a, f1040.L18b, f1040.L18c, f1040.L18d]));

  f1040.L19 = round(add([f1040.L17, f1040.L18e]));

  const overpaid = sub(f1040.L19, f1040.L16)
  f1040.L20 = round(gt(overpaid, "0") ? overpaid : "0");

  const owed = sub(f1040.L16, f1040.L19)
  f1040.L23 = round(gt(owed, "0") ? owed : "0");

  forms.f1040 = [f1040];
  return forms;
}
