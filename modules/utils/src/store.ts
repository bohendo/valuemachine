import { emptyStore, Store, StoreKey } from "@valuemachine/types";

export const getLocalStore = (localStorage: any): Store => ({
  load: (key: StoreKey): any => {
    try {
      const data = localStorage.getItem(key);
      if (data) return JSON.parse(data);
      return emptyStore[key];
    } catch (e) {
      return emptyStore[key];
    }
  },
  save: (key: StoreKey, data: any): void => {
    localStorage.setItem(key, JSON.stringify(data || emptyStore[key]));
  },
});

export const getFileStore = (dirpath: string, fs: any): Store => {
  const getFilePath = (key: StoreKey): string => `${
    dirpath.endsWith("/") ? dirpath.replace(/\/$/, "") : dirpath
  }/${
    key.replace(/[A-Z]/g, "-$&").replace(/^-/, "").toLowerCase()
  }.json`;
  return {
    load: (key: StoreKey): any => {
      try {
        return JSON.parse(fs.readFileSync(getFilePath(key), "utf8"));
      } catch (e) {
        return emptyStore[key];
      }
    },
    save: (key: StoreKey, data: any): void => {
      fs.writeFileSync(getFilePath(key), JSON.stringify(data, null, 2));
    },
  };
};
