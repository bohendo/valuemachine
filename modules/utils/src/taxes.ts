import { isAddress } from "@ethersproject/address";
import {
  Account,
  ExternalSources,
  OnchainSources,
  SecurityProvider,
  SecurityProviders,
} from "@finances/types";

export const jurisdictions = {
  [ExternalSources.Coinbase]: SecurityProviders.USD,
  [ExternalSources.DigitalOcean]: SecurityProviders.USD,
  [ExternalSources.Wyre]: SecurityProviders.USD,
  [ExternalSources.Wazirx]: SecurityProviders.INR,
};

export const getJurisdiction = (account: Account): SecurityProvider => {
  const source = account.split("-")[0];
  return (isAddress(account) || Object.keys(OnchainSources).includes(source))
    ? SecurityProviders.ETH
    : (
      jurisdictions[source]
      || (Object.keys(SecurityProviders).includes(source)
        ? source
        : SecurityProviders.Unknown
      )
    );
};
