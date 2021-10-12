import Card from "@material-ui/core/Card";

export const decorators = [
  (Story) => (
    <Card style={{ margin: "3em", padding: "0px" }}>
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
