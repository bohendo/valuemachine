import { muiTheme } from "storybook-addon-material-ui"

export const decorators = [
  muiTheme(),
  (Story) => (
    <div style={{ padding: "3em" }}>
      <Story />
    </div>
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
