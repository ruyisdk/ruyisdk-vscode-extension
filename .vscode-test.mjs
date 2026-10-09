import { defineConfig } from '@vscode/test-cli'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  files: 'out/test/**/*.test.js',
  workspaceFolder: path.dirname(fileURLToPath(import.meta.url)),
})
