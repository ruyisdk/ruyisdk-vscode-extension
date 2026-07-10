// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Venv Module - Venv Detection Helper
 *
 * Provides stateless helper functions for detecting Ruyi virtual environments
 * in the workspace. These functions return data only and do NOT update global
 * state or UI.
 */

import * as path from 'path'
import * as vscode from 'vscode'

import { logger } from '../common/logger'

import type { VenvInfo } from './types'

const VENV_ACTIVATE_PATTERN = '{*,*/*}/bin/ruyi-activate'

/**
 * Scans the workspace for Ruyi virtual environments.
 * Iterates through 1st and 2nd level subdirectories to find venvs.
 * A directory is considered a Ruyi venv if it contains a "bin" subdirectory
 * which contains a "ruyi-activate" file.
 *
 * @returns Array of VenvInfo objects for detected venvs
 */
export async function scanWorkspaceForVenvs(): Promise<VenvInfo[]> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
  if (!workspaceFolder) {
    return []
  }

  try {
    const activateScripts = await vscode.workspace.findFiles(
      new vscode.RelativePattern(workspaceFolder, VENV_ACTIVATE_PATTERN),
      null,
    )

    return activateScripts
      .map((activateScript) => {
        const venvPath = path.dirname(path.dirname(activateScript.fsPath))
        return {
          path: path.relative(workspaceFolder.uri.fsPath, venvPath),
          name: path.basename(venvPath),
        }
      })
      .sort((a, b) => a.path.localeCompare(b.path))
  }
  catch (error) {
    logger.error('Failed to detect venvs:', error)
    return []
  }
}
