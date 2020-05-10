import { emptyStore } from "@finances/types";

const load = (key: string): any => {
  try {
    let data = localStorage.getItem(key)
    if (data) return JSON.parse(data)
    return emptyStore[key];
  } catch (e) {
    return emptyStore[key];
  }
}

const save = (key: string, data: any): void => {
  localStorage.setItem(key, JSON.stringify(data))
}

export const store = { load, save };
