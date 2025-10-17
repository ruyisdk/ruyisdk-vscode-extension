// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Common Utilities
 *
 * Responsibilities:
 *  - Define supported platforms
 *  - Centralize small reusable functions shared across commands
 *
 * Supported Node.js `process.platform` values:
 *  - 'linux'   → Linux
 *  - 'darwin'  → macOS
 *  - 'win32'   → Windows
 */

import * as cp from 'child_process'
import type { ExecException } from 'node:child_process'
import * as util from 'util'

const execAsync = util.promisify(cp.exec)

export async function resolvePython(): Promise<string | null> {
  for (const cmd of ['python3', 'python', 'py']) {
    try {
      await execAsync(`${cmd} --version`)
      return cmd
    }
    catch {
      continue
    }
  }
  return null
}

export function formatExecError(e: unknown): string {
  const err = e as ExecException & {
    stderr?: string
    stdout?: string
  }
  return (
    err.stderr?.trim()
    || (typeof err.message === 'string' ? err.message.trim() : '')
    || String(e) || 'Unknown error.')
}
