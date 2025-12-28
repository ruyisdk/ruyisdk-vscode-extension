// SPDX-License-Identifier: Apache-2.0
/**
 * Venv Deactivate Command
 *
 * VS Code command ID: `ruyi.venv.deactivate`
 *
 * Responsibilities:
 * - Deactivate the currently active Ruyi virtual environment.
 */

import * as vscode from 'vscode'

import { VenvTreeItem } from '../../features/venv/VenvTree'

import { checkVenvStatus, refreshOnStateChange } from './helpers'
import { manageRuyiTerminal } from './manageCurrentVenv'

export default function registerDeactivateVenvCommand(
  context: vscode.ExtensionContext,
) {
  const disposable = vscode.commands.registerCommand(
    'ruyi.venv.deactivate',
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

      // Verify this is the currently active venv
      if (!status.isActive) {
        vscode.window.showWarningMessage(
          `Virtual environment "${venv.name}" is not currently active.`,
        )
        return
      }

      // Subscribe to state change BEFORE triggering the action
      refreshOnStateChange()

      // Deactivate by passing null
      manageRuyiTerminal(null)
    },
  )

  context.subscriptions.push(disposable)
}
