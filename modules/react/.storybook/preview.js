import Box from "@mui/system/Box";

export const decorators = [
  (Story) => (
    <Box sx={{ m: 4, p: 0 }}>
      <Story />
    </Box>
  ),
];

export const parameters = {
  actions: {
    argTypesRegex: "^on[A-Z].*",
  },
  backgrounds: {
    default: "dark",
  },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
}
