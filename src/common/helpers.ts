// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Helper Functions
 *
 * Responsibilities:
 *  - Provide common utility functions for the extension.
 */
import * as vscode from 'vscode'

import { ConfigKey } from './constants'

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

/**
 * Helper function to get the full configuration key string.
 * @param key A key from CONFIG_KEYS
 * @returns The full key, e.g., "ruyi.checkForUpdates"
 */

export function fullKey(key: ConfigKey): `ruyi.${string}` {
  return `ruyi.${key}`
}
