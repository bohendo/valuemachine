
export type Store = {
  save: (key: string, val: any) => void;
  load: (key: string) => any;
};

export const getLocalStore = (localStorage: any): Store => ({
  load: (key: string): any => {
    try {
      const data = localStorage.getItem(key);
      if (data) return JSON.parse(data);
      return undefined;
    } catch (e) {
      return undefined;
    }
  },
  save: (key: string, data: any): void => {
    if (!data) return;
    localStorage.setItem(key, JSON.stringify(data));
  },
});

export const getFileStore = (dirpath: string, fs: any): Store => {
  const getFilePath = (key: string): string => `${
    dirpath.endsWith("/") ? dirpath.replace(/\/$/, "") : dirpath
  }/${
    key.replace(/[A-Z]/g, "-$&").replace(/^-/, "").toLowerCase()
  }.json`;
  return {
    load: (key: string): any => {
      try {
        return JSON.parse(fs.readFileSync(getFilePath(key), "utf8"));
      } catch (e) {
        return undefined;
      }
    },
    save: (key: string, data: any): void => {
      if (!data) return;
      fs.writeFileSync(getFilePath(key), JSON.stringify(data, null, 2));
    },
  };
};
