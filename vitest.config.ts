import { defineConfig, configDefaults } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    tsconfigPaths({
      configNames: ['tsconfig.node.json'],
    }),
  ],
  test: {
    setupFiles: ['./vitest.setup.ts'],
    environment: 'jsdom',
    globals: true,
    exclude: ['docs/*', ...configDefaults.exclude],
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
  },
});
