// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Common Utilities
 *
 * Responsibilities:
 *  - Define supported platforms
 *  - Provide a list of Python interpreter candidates
 *  - Centralize small reusable functions shared across commands
 *
 * Supported Node.js `process.platform` values:
 *  - 'linux'   → Linux
 *  - 'darwin'  → macOS
 *  - 'win32'   → Windows
 */

import type { ExecException } from 'node:child_process'

const SUPPORTED_PLATFORMS: NodeJS.Platform[] = ['linux', 'darwin', 'win32']

export function isSupportedPlatform(): boolean {
  return SUPPORTED_PLATFORMS.includes(process.platform)
}

export function pythonCandidates(): string[] {
  return ['python3', 'python', 'py']
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
