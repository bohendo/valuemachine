export { Field, Forms } from './mappings';

export type TaxableTx = {
  timestamp: string;
  asset: string;
  quantity: string;
  price: string;
  from: string;
  to: string;
  valueIn: string;
  valueOut: string;
  fee: string;
};

type Dependent = {
  FirstName: string;
  LastName: string;
  SSN: string;
  Relationship: string;
  ChildTaxCredit: boolean;
  CreditForOther: boolean;
}

export type InputData = {
  taxYear: string;
  forms: string[];
  debugLogs: string;

  FilingStatus: "Single" | "MarriedFilingJointly" | "MarriedFilingSeparately" | "HeadOfHousehold" | "QualifiedWidow";
  FirstName: string;
  MiddleInitial: string;
  LastName: string;
  SocialSecurityNumber: string;
  SpouseFirstName?: string;
  SpouseMiddleInitial?: string;
  SpouseLastName?: string;
  SpouseSocialSecurityNumber?: string;

  StreetAddress: string;
  AptNumber: string;
  CityStateZip: string;
  ForeignCountry: string;
  ForeignState: string;
  ForeignPostalCode: string;

  Dependents: Dependent[];

  income: {
    payments: any;
    exceptions: any;
    dividends: any;
  },

  expenses: any;

  txHistory: string[];
  assets: any;
  addresses: { [key: string]: string };

  f1040: any;
  f1040s1: any;
  f1040s2: any;
  f1040sse: any;
  f1040sc: any;
  f1040sd: any;
  f8949: any;
}
