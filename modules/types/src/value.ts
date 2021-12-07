import { Static, Type } from "@sinclair/typebox";

import { Asset, Amount, DecString } from "./strings";

export type Value = { asset: Asset; amount: Amount; };

export const Balances = Type.Record(Type.String(), DecString);
export type Balances = Static<typeof Balances>;
