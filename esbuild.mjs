/**
 * build script to compile the extension with esbuild.
 * this is necessary to read environment variables and substitute process.env -- see https://github.com/evanw/esbuild/issues/69
 * 
 */
import path from 'node:path';
import { build, context } from 'esbuild';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// we'll just use a very lazy and basic command line parser
const args = process.argv.slice(2);

const ENV_VARS_TO_SUBSTITUTE = [
  'FOOBAR',
];

const define = {};
for (const key of ENV_VARS_TO_SUBSTITUTE) {
  define[`process.env.${key}`] = JSON.stringify(process.env[key]);
}

console.log(JSON.stringify(define, null, 2));

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ['src/extension.ts'],
  outfile: 'out/extension.js',
  bundle: true,
  minify: args.includes('--minify'),
  sourcemap: args.includes('--sourcemap'),
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  loader: {
    '.html': 'text',
  },
  define: define,
};

if (args.includes('--watch')) {
  try {
    let ctx = await context(options);
    await ctx.watch();
    console.log('watching...');
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
} else {
  build(options).catch(() => process.exit(1));
}

