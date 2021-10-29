import Card from "@mui/material/Card";

export const decorators = [
  (Story) => (
    <Card sx={{ m: 4, p: 0 }}>
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
