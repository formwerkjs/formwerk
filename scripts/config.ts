import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { InputOptions, ModuleFormat, OutputOptions } from 'rolldown';
import { replacePlugin } from 'rolldown/plugins';
import { normalizePath, slashes } from './normalize-path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const formatNameMap = {
  core: 'Formwerk',
  devtools: 'FormwerkDevtools',
};

const pkgNameMap = {
  core: 'core',
  devtools: 'devtools',
};

const formatExt: Partial<Record<ModuleFormat, string>> = {
  esm: 'mjs',
  es: 'mjs',
  iife: 'iife.js',
  cjs: 'cjs',
};

function testEsm(format: string) {
  return ['es', 'esm'].includes(format);
}

async function createConfig(pkg: keyof typeof pkgNameMap, format: ModuleFormat) {
  // An import assertion in a dynamic import
  const { default: info } = await import(normalizePath(path.resolve(__dirname, `../packages/${pkg}/package.json`)), {
    assert: {
      type: 'json',
    },
  });

  const { version } = info;
  const isEsm = testEsm(format);

  const plugins = [
    replacePlugin({
      __VERSION__: JSON.stringify(version),
      __DEV__: isEsm ? `(process.env.NODE_ENV !== 'production')` : 'false',
    }),
  ];

  const config: { input: InputOptions; output: OutputOptions; bundleName: string } = {
    bundleName: `${pkgNameMap[pkg]}.${formatExt[format] ?? 'js'}`,
    input: {
      plugins,
      tsconfig: slashes(path.resolve(__dirname, `../tsconfig.lib.json`)),
      input: slashes(path.resolve(__dirname, `../packages/${pkg}/src/index.ts`)),
      external: [
        'vue',
        ...(pkg === 'core'
          ? [
              '@standard-schema/utils',
              '@standard-schema/spec',
              '@internationalized/date',
              '@formwerk/devtools',
              'klona',
              'klona/full',
              'type-fest',
            ]
          : []),
        ...(pkg === 'devtools' ? ['@vue/devtools-api', '@vue/devtools-kit'] : []),
      ].filter(Boolean) as string[],
    },
    output: {
      banner: `/**
  * @formwerk/${pkg} v${version}
  * (c) ${new Date().getFullYear()} Abdelrahman Awad
  * @license MIT
  */`,
      format,
      name: format === 'iife' ? formatNameMap[pkg] : undefined,
      globals: {
        vue: 'Vue',
      },
    },
  };

  return config;
}

export { formatNameMap, pkgNameMap, formatExt, createConfig };
