import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { ModuleFormat } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { normalizePath, slashes } from './normalize-path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const formatNameMap = {
  core: 'Formwerk',
};

const pkgNameMap = {
  core: 'core',
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

const createPlugins = ({ version, format, pkg }: { version: string; format: ModuleFormat; pkg: string }) => {
  const isEsm = testEsm(format);
  const tsPlugin = typescript({
    tsconfig: normalizePath(path.resolve(__dirname, `../tsconfig.lib.json`)),
    declarationDir: normalizePath(path.resolve(__dirname, `../packages/${pkg}/dist`)),
  });

  return [
    replace({
      preventAssignment: true,
      values: {
        __VERSION__: version,
        __DEV__: isEsm ? `(process.env.NODE_ENV !== 'production')` : 'false',
      },
    }),
    tsPlugin,
    resolve({
      dedupe: ['klona', 'klona/full'],
    }),
    commonjs(),
  ];
};

async function createConfig(pkg: keyof typeof pkgNameMap, format: ModuleFormat) {
  // An import assertion in a dynamic import
  const { default: info } = await import(normalizePath(path.resolve(__dirname, `../packages/${pkg}/package.json`)), {
    assert: {
      type: 'json',
    },
  });

  const { version } = info;

  const isEsm = testEsm(format);

  const config = {
    bundleName: `${pkgNameMap[pkg]}.${formatExt[format] ?? 'js'}`,
    input: {
      input: slashes(path.resolve(__dirname, `../packages/${pkg}/src/index.ts`)),
      external: [
        'vue',
        isEsm ? '@vue/devtools-api' : undefined,
        isEsm ? '@vue/devtools-kit' : undefined,
        'klona',
        '@standard-schema/utils',
        '@standard-schema/spec',
        '@js-temporal/polyfill',
      ].filter(Boolean) as string[],
      plugins: createPlugins({ version, pkg, format }),
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

export { formatNameMap, pkgNameMap, formatExt, createConfig, createPlugins };
