const fs = require('node:fs')
const esbuild = require('esbuild')

const watch = process.argv.includes('--watch')

const buildOptions = {
  entryPoints: {
    extension: 'src/extension.ts',
    'test/build.test': 'src/test/build.test.js',
  },
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  outdir: 'out',
  sourcemap: true,
  external: ['vscode', 'mocha'],
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