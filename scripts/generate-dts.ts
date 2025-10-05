import ts from 'typescript';
import { consola } from 'consola';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import { rolldown, type RolldownOptions, type OutputOptions } from 'rolldown';
import tsconfig from '../tsconfig.json' assert { type: 'json' };
import { pkgNameMap } from './config';
import { dts } from 'rolldown-plugin-dts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function generateDts(pkg) {
  consola.start(`👕 Generating Declaration Files for ${pkg} ...`);
  const declarationDir = `../packages/${pkg}/dist/types`;

  const options = {
    ...tsconfig,
    declaration: true,
    declarationMap: false,
    emitDeclarationOnly: true,
    declarationDir,
  } as unknown as ts.CompilerOptions;

  const host = ts.createCompilerHost(options);
  const createdFiles = {};
  host.writeFile = (fileName, contents) => {
    createdFiles[fileName] = contents;
  };

  // Prepare and emit the d.ts files
  const program = ts.createProgram([path.resolve(__dirname, `../packages/${pkg}/src/index.ts`)], options, host);
  program.emit();
  for (const [file, contents] of Object.entries(createdFiles)) {
    fs.outputFileSync(path.resolve(__dirname, file), contents as string);
  }

  await bundleDts(declarationDir, pkg);
}

async function bundleDts(declarationDir, pkg) {
  let entry = path.join(__dirname, declarationDir, 'index.d.ts');
  // if it doesn't exist then probably was nested cause of relative imports
  if (!fs.existsSync(entry)) {
    entry = path.resolve(__dirname, declarationDir, pkg, 'src', 'index.d.ts');
  }

  // If we cannot find the 'index.d.ts', panic!
  if (!fs.existsSync(entry)) {
    throw new Error('Cannot find index.d.ts at ' + entry);
  }

  const config = {
    input: entry,
    output: { file: `packages/${pkg}/dist/${pkgNameMap[pkg]}.d.ts`, format: 'es' },
    plugins: [
      dts({
        tsconfig: path.resolve(__dirname, `../tsconfig.lib.json`),
      }),
    ],
  };

  const bundle = await rolldown(config as RolldownOptions);
  await bundle.write(config.output as OutputOptions);
  await fs.remove(`packages/${pkg}/dist/types`);
  consola.success(`👕 Bundled ${pkg} Declaration Files`);
}
