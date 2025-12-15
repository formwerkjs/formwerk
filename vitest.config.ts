import { defineConfig, configDefaults } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    tsconfigPaths({
      configNames: ['tsconfig.node.json'],
    }),
  ],
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
    setupFiles: ['./vitest.setup.browser.ts'],
    globals: true,
    exclude: ['**/*.node.spec.ts', 'docs/*', ...configDefaults.exclude],
    coverage: {
      provider: 'v8',
      reporter: ['html', 'json'],
      include: [...(configDefaults.coverage.include || [])],
      exclude: [
        '**/*/devtools.ts',
        'packages/**/dist/**',
        'packages/playground/**',
        'packages/test-utils/**',
        'packages/starter-kits/**',
        './*.ts',
        './*.js',
        'docs/*',
        'scripts/**',
        ...(configDefaults.coverage.exclude || []),
      ],
    },
  },
  define: {
    __DEV__: JSON.stringify(true),
    __VERSION__: JSON.stringify('1.0.0'),
    __VUE_OPTIONS_API__: JSON.stringify(true),
    __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
  },
});
