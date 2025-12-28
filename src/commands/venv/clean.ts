// SPDX-License-Identifier: Apache-2.0
/**
 * Venv Clean Command
 *
 * VS Code command ID: `ruyi.venv.clean`
 *
 * Responsibilities:
 * - Delete a non-active Ruyi virtual environment.
 */

import * as path from 'path'
import * as vscode from 'vscode'

import { getWorkspaceFolderPath } from '../../common/helpers'
import { VenvTreeItem } from '../../features/venv/VenvTree'

import { checkVenvStatus } from './helpers'

export default function registerCleanADeactivatedVenvCommand(
  context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('ruyi.venv.clean', async (venv?: VenvTreeItem) => {
    if (!venv) {
      return
    }

    // Check if the picked venv is the current active one
    const venvPath = `./${venv.venvPath}`
    const status = checkVenvStatus(venvPath)

    if (!status) {
      vscode.window.showErrorMessage('Please open a workspace folder first.')
      return
    }

    if (status.isActive) {
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
        const workspacePath = getWorkspaceFolderPath()
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
        vscode.commands.executeCommand('ruyi.venv.refresh')
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
