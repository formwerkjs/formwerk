import { consola } from 'consola';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec as execCb } from 'child_process';
import { promisify } from 'util';
import { watch } from 'rollup';
import { createConfig, pkgNameMap } from './config';
import { generateDts } from './generate-dts';

const exec = promisify(execCb);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

(async function RunWatcher() {
  const arg = [...process.argv][2];
  const packages = await Promise.all(
    Object.keys(pkgNameMap)
      .filter(pkg => {
        return arg === pkg || !arg;
      })
      .map(async pkg => {
        const config = await createConfig(pkg, 'es');

        return {
          pkg,
          config,
        };
      }),
  );

  const watcher = watch(
    packages.map(({ pkg, config }) => {
      return {
        input: config.input.input,
        plugins: config.input.plugins,
        output: {
          ...config.output,
          file: `packages/${pkgNameMap[pkg]}/dist/${config.bundleName}`,
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
