import { consola } from 'consola';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import { rolldown, type ModuleFormat } from 'rolldown';
import { createConfig, pkgNameMap } from './config';
import { reportSize } from './info';
import { generateDts } from './generate-dts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function logPkgSize(pkg: string) {
  const pkgout = path.join(__dirname, `../packages/${pkg}/dist`);
  const fileName = pkgNameMap[pkg as keyof typeof pkgNameMap];
  const filePath = `${pkgout}/${fileName}.mjs`;

  const code = fs.readFileSync(filePath, 'utf-8');
  const stats = reportSize({ code, path: filePath });

  consola.info(`📊 @formwerk/${pkg}`, `${stats}`);
}

async function build(pkg: string) {
  consola.start(`📦 Generating bundle for @formwerk/${pkg}`);
  const pkgout = path.join(__dirname, `../packages/${pkg}/dist`);
  await fs.emptyDir(pkgout);
  for (const format of ['esm', 'iife', 'cjs'] as ModuleFormat[]) {
    const { input, output, bundleName } = await createConfig(pkg as 'core', format);
    const bundle = await rolldown(input);
    const {
      output: [{ code }],
    } = await bundle.generate(output);

    const outputPath = path.join(pkgout, bundleName);
    fs.outputFileSync(outputPath, code);

    if (format === 'iife') {
      const {
        output: [{ code }],
      } = await bundle.generate({
        ...output,
        minify: true,
      });

      if (!code) {
        throw new Error(`🚨 Minification error: ${pkg}/${bundleName}`);
      }

      const fileName = bundleName.replace(/\.js$/, '.prod.js');
      const filePath = `${pkgout}/${fileName}`;
      fs.outputFileSync(filePath, code);
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
