import Card from "@mui/material/Card";

export const decorators = [
  (Story) => (
    <Card sx={{ m: 2, p: 2 }} id="storybook-root">
      <Story />
    </Card>
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
