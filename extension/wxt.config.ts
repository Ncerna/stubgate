import { defineConfig } from 'wxt';
import { MATCHES } from './src/platform/matches';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: ({ browser }) => ({
    name: 'Stubgate',
    description: 'Simulate and modify HTTP responses without leaving the browser.',
    permissions: ['storage'],
    icons: { 16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png' },
    ...(browser === 'firefox' && {
      // Firefox MV3 treats host permissions as optional and needs the content scripts' sites granted.
      host_permissions: MATCHES,
      browser_specific_settings: {
        gecko: {
          // PLACEHOLDER: replace with a stable id before publishing (it cannot change afterwards).
          id: 'stubgate@example.invalid',
          data_collection_permissions: { required: ['none'] },
        },
      },
    }),
  }),
});
