import { consola } from 'consola';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import { rollup, type ModuleFormat } from 'rollup';
import * as Terser from 'terser';
import { createConfig, pkgNameMap } from './config';
import { reportSize } from './info';
import { generateDts } from './generate-dts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function minify({ code, pkg, bundleName }) {
  const pkgout = path.join(__dirname, `../packages/${pkg}/dist`);
  const output = await Terser.minify(code, {
    compress: true,
    mangle: true,
  });

  if (!output.code) {
    throw new Error(`🚨 Minification error: ${pkg}/${bundleName}`);
  }

  const fileName = bundleName.replace(/\.js$/, '.prod.js');
  const filePath = `${pkgout}/${fileName}`;
  fs.outputFileSync(filePath, output.code);
}

function logPkgSize(pkg: string) {
  const pkgout = path.join(__dirname, `../packages/${pkg}/dist`);
  const fileName = pkgNameMap[pkg];
  const filePath = `${pkgout}/${fileName}.mjs`;

  const code = fs.readFileSync(filePath, 'utf-8');
  const stats = reportSize({ code, path: filePath });

  consola.info(`📊 @formwerk/${pkg}`, `${stats}`);
}

async function build(pkg) {
  consola.start(`📦 Generating bundle for @formwerk/${pkg}`);
  const pkgout = path.join(__dirname, `../packages/${pkg}/dist`);
  // await fs.emptyDir(pkgout);
  for (const format of ['esm', 'iife', 'cjs'] as ModuleFormat[]) {
    const { input, output, bundleName } = await createConfig(pkg, format);
    const bundle = await rollup(input);
    const {
      output: [{ code }],
    } = await bundle.generate(output);

    const outputPath = path.join(pkgout, bundleName);
    fs.outputFileSync(outputPath, code);

    if (format === 'iife') {
      await minify({ bundleName, pkg, code });
    }
  }

  await generateDts(pkg);
  consola.success(`📦 Bundled @formwerk/${pkg}`);
  logPkgSize(pkg);

  return true;
}

(async function Bundle() {
  const arg = [...process.argv][2];
  const packages = Object.keys(pkgNameMap);
  for (const pkg of packages) {
    if (arg === pkg || !arg) {
      await build(pkg);
    }
  }

  if (process.platform === 'win32') process.exit(0);
})();
