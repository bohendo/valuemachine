import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { getLocalStore } from "@valuemachine/utils";
import React, { useEffect, useState } from "react";

import "./Theme.css";
import { Main } from "./Main";

const store = getLocalStore(localStorage);

const ThemeStore = "Theme" as any;
const lightRed = "#e699a6";
const darkRed = "#801010";

const darkTheme = createTheme({
  palette: {
    primary: {
      main: darkRed,
    },
    secondary: {
      main: lightRed,
    },
    mode: "dark",
  },
});

const lightTheme = createTheme({
  palette: {
    primary: {
      main: lightRed,
    },
    secondary: {
      main: darkRed,
    },
    mode: "light",
  },
});

console.log("darkTheme", darkTheme);

export const Theme: React.FC = () => {
  const [theme, setTheme] = useState(store.load(ThemeStore) || "dark");

  useEffect(() => {
    if (!theme) return;
    console.log(`Saving theme`, theme);
    store.save(ThemeStore, theme);
  }, [theme]);

  return (
    <ThemeProvider theme={theme === "light" ? lightTheme : darkTheme}>
      <CssBaseline/>
      <Main
        theme={theme}
        setTheme={setTheme}
      />
    </ThemeProvider>
  );
};
