import { consola } from 'consola';
import { fileURLToPath } from 'url';
import { watch } from 'rollup';
import { createConfig, pkgNameMap } from './config';
import { generateDts } from './generate-dts';
import path, { dirname } from 'path';
import { ModuleFormat } from 'rollup';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const formats: ModuleFormat[] = ['es', 'iife', 'cjs'];

(async function RunWatcher() {
  const arg = [...process.argv][2];
  const packages = await Promise.all(
    Object.keys(pkgNameMap)
      .filter(pkg => {
        return arg === pkg || !arg;
      })
      .map(pkg => {
        return Promise.all(
          formats.map(async f => {
            const config = await createConfig(pkg as keyof typeof pkgNameMap, f);

            return {
              config,
              pkg: pkg as keyof typeof pkgNameMap,
            };
          }),
        );
      }),
  );

  const watcher = watch(
    packages.flat().map(({ pkg, config }) => {
      return {
        input: config.input.input,
        plugins: config.input.plugins,
        output: {
          ...config.output,
          file: path.join(__dirname, `../packages/${pkgNameMap[pkg]}/dist/${config.bundleName}`),
        },
        external: config.input.external,
      };
    }),
  );

  consola.start('Watching for changes...');

  watcher.on('change', async (file, { event }) => {
    if (event === 'update') {
      consola.info(`📦 ${file} changed, rebuilding...`);
    }
    if (event === 'create') {
      consola.info(`📦 ${file} created, rebuilding...`);
    }
    if (event === 'delete') {
      consola.info(`📦 ${file} deleted, rebuilding...`);
    }

    const pkgRE = /packages\/([^/]+)\//;
    const pkgName = pkgRE.exec(file)?.[1];

    await generateDts(pkgName);
  });

  watcher.on('event', evt => {
    if (evt.code === 'ERROR') {
      consola.error(evt.error);
    }
  });
})();
