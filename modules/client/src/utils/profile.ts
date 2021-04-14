import { Address, AddressEntry, Profile, ProfileJson } from "@finances/types";

export const getProfile = (userProfile: ProfileJson): Profile => {

  const getAddresses = (): Address[] => {
    return userProfile.addressBook.map((addressEntry: AddressEntry) => {
      return addressEntry.address;
    })
  };

  return {
    json: userProfile,
    getAddresses
  } as Profile;
};