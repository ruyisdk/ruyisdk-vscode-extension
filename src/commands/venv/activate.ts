// SPDX-License-Identifier: Apache-2.0
/**
 * Venv Activate Command
 *
 * VS Code command ID: `ruyi.venv.activate`
 *
 * Responsibilities:
 * - Activate a specific Ruyi virtual environment.
 * - Automatically deactivates the currently active environment if switching.
 */

import * as vscode from 'vscode'

import { VenvTreeItem } from '../../features/venv/VenvTree'

import { checkVenvStatus, refreshOnStateChange } from './helpers'
import { manageRuyiTerminal } from './manageCurrentVenv'

export default function registerActivateVenvCommand(
  context: vscode.ExtensionContext,
) {
  const disposable = vscode.commands.registerCommand(
    'ruyi.venv.activate',
    async (venv?: VenvTreeItem) => {
      if (!venv) {
        vscode.window.showErrorMessage('No virtual environment selected.')
        return
      }

      const venvPath = `./${venv.venvPath}`
      const status = checkVenvStatus(venvPath)

      if (!status) {
        vscode.window.showErrorMessage('Please open a workspace folder first.')
        return
      }

      // Check if this venv is already active
      if (status.isActive) {
        vscode.window.showInformationMessage(
          `Virtual environment "${venv.name}" is already active.`,
        )
        return
      }

      // Subscribe to state change BEFORE triggering the action
      refreshOnStateChange()

      // Activate the selected venv (will auto-deactivate current one if exists)
      manageRuyiTerminal(venvPath)
    },
  )

  context.subscriptions.push(disposable)
}
