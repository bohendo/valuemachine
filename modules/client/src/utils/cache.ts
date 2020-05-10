import { emptyStore } from "@finances/types";

const load = (key: string): any => {
  try {
    // console.log(`Loading key ${key} from store`);
    let data = localStorage.getItem(key)
    if (data) return JSON.parse(data)
    return emptyStore[key];
  } catch (e) {
    return emptyStore[key];
  }
}

const save = (key: string, data?: any): void => {
  // console.log(`Loading data to store key ${key}`);
  localStorage.setItem(key, JSON.stringify(data || emptyStore[key]))
}

export const store = { load, save };
