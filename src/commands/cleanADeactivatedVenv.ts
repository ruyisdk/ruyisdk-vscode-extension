// SPDX-License-Identifier: Apache-2.0
/**
 * CreateCommand
 *
 * VS Code command: `ruyi.venv.clean`
 *
 * Responsibilities:
 * - Delete a non-active Ruyi virtual environment
 */

import * as path from 'path'
import * as vscode from 'vscode'

import { currentVenv } from './switchFromVenvs'

// import {isSupportedPlatform} from '../common/utils';
// import {createVenv} from '../features/venv/CreateVenv';

export default function registerCleanADeactivatedVenvCommand(
  context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('ruyi.venv.clean', async () => {
    // Invoke detectVenv command to let user pick a venv to operate.
    const pickedVenv = await vscode.commands.executeCommand('ruyi.venv.detect', 'switch') as
      { label: string, description: string, rawPath: string } | undefined
    if (!pickedVenv) {
      return
    }
    // Check if the picked venv is the current active one
    const venvPath = `./${pickedVenv.rawPath}`
    if (venvPath === currentVenv) {
      vscode.window.showErrorMessage('Cannot delete the currently active Ruyi venv. Please deactivate it first.')
      return
    }
    // Confirm deletion
    const confirm = await vscode.window.showWarningMessage(
      `Are you sure you want to delete the Ruyi venv at ${venvPath}? This action cannot be undone.`,
      { modal: true },
      'Delete',
    )
    if (confirm === 'Delete') {
      const fs = vscode.workspace.fs

      try {
        // Construct absolute path
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
        if (!workspaceFolder) {
          throw new Error('No workspace folder open')
        }
        const workspacePath = workspaceFolder.uri.fsPath
        let cleanPath = venvPath
        if (cleanPath.startsWith('./')) {
          cleanPath = cleanPath.substring(2)
        }
        const absolutePath = path.join(workspacePath, cleanPath)
        const venvUri = vscode.Uri.file(absolutePath)
        await fs.stat(venvUri)

        // Delete the venv directory
        await fs.delete(venvUri, { recursive: true, useTrash: false })
        vscode.window.showInformationMessage(`Ruyi venv at ${absolutePath} has been deleted.`)
      }
      catch (error: unknown) {
        if (error instanceof Error) {
          vscode.window.showErrorMessage(`Failed to delete venv: ${error.message}`)
        }
        else {
          vscode.window.showErrorMessage(`Failed to delete venv: ${String(error)}`)
        }
      }
    }
  })
  context.subscriptions.push(disposable)
}
