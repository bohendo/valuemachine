import { emptyStore, Store, StoreKey } from "@valuemachine/types";

type LocalStorageish = {
  getItem: (key: string) => string | null;
  setItem: (key: string, data: string) => void;
};
export const getLocalStore = (localStorage: LocalStorageish): Store => ({
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

type Fsish = {
  readFileSync: (path: string, encoding: string | { encoding: string }) => string;
  writeFileSync: (path: string, data: string) => void;
};
export const getFileStore = (dirpath: string, fs: Fsish): Store => {
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
