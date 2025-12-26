import { defineConfig, configDefaults } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import tsconfigPaths from 'vite-tsconfig-paths';
import type { BrowserCommand } from 'vitest/node';
import axe from 'axe-core';

type AxeCommandContext = {
  provider?: { name?: string };
  frame?: () => Promise<{
    evaluate: <T>(fnOrSource: unknown, ...args: unknown[]) => Promise<T>;
  }>;
};

const axeCheck: BrowserCommand<[selector?: string]> = async (ctx, selector = 'body') => {
  const { provider, frame: frameResolver } = ctx as unknown as AxeCommandContext;

  if (provider?.name !== 'playwright') {
    throw new Error(`axeCheck only supports playwright provider, got: ${provider?.name}`);
  }

  if (typeof frameResolver !== 'function') {
    const keys = Object.keys(ctx as unknown as Record<string, unknown>);
    throw new Error(`axeCheck command context has no 'frame()' resolver. Context keys: ${keys.join(', ')}`);
  }

  const frame = await frameResolver();

  // Inject axe-core into the test iframe, then run within that frame.
  // Using the iframe frame avoids failures from Vitest's outer orchestrator page.
  await frame.evaluate(axe.source);
  const results = (await frame.evaluate(async (scopeSelector: string) => {
    // @ts-expect-error - injected by axe.source
    return await window.axe.run(scopeSelector);
  }, selector)) as { violations?: unknown[] };

  return (results.violations || []) as unknown[];
};

export default defineConfig({
  plugins: [
    tsconfigPaths({
      configNames: ['tsconfig.node.json'],
    }),
  ],
  resolve: {
    alias: {
      vue: 'vue/dist/vue.esm-bundler.js',
    },
  },
  test: {
    testTimeout: 5000,
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
      commands: {
        axeCheck,
      },
    },
    setupFiles: ['./vitest.setup.browser.ts', 'vitest-browser-vue'],
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
    __VUE_OPTIONS_API__: JSON.stringify(true),
    __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
  },
});
