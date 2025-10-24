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
import * as vscode from 'vscode'

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

/** Get the path of the first workspace folder,
 *  or return an error message if none is open.
 *
 *  @returns The workspace folder path, or an error message string.
 */
export function getWorkspaceFolderPath(): string {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
  if (!workspaceFolder) {
    throw `Exception: No workspace folder is open in VSCode. 
      We need a workspace folder to run the command in context.`
  }
  const workspacePath = workspaceFolder.uri.fsPath
  return workspacePath
}
