const fs = require('node:fs')
const esbuild = require('esbuild')

const watch = process.argv.includes('--watch')

const buildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  outfile: 'out/extension.js',
  sourcemap: true,
  external: ['vscode'],
  logLevel: 'info',
}

async function build() {
  fs.rmSync('out', { recursive: true, force: true })

  if (watch) {
    const context = await esbuild.context(buildOptions)
    await context.watch()
    console.log('Watching for changes...')
    return
  }

  await esbuild.build(buildOptions)
}

build().catch(() => process.exit(1))