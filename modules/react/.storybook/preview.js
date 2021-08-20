import { muiTheme } from 'storybook-addon-material-ui'

export const decorators = [
  muiTheme(),
  (Story) => (
    <div style={{ margin: '3em' }}>
      <Story />
    </div>
  ),

];

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
}
