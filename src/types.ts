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

export type InputData = {
  taxYear: string;
  forms: string[];
  debugLogs: string;

  FirstName: string;
  MiddleInitial: string;
  LastName: string;
  SocialSecurityNumber: string;
  SpouseFirstName?: string;
  SpouseMiddleInitial?: string;
  SpouseLastName?: string;
  SpouseSocialSecurityNumber?: string;

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
  f1040s3: any;
  f1040sse: any;
  f1040sc: any;
  f1040sd: any;
  f8949: any;
}
