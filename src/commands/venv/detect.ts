// SPDX-License-Identifier: Apache-2.0
/**
 * Venv Detect Command
 *
 * VS Code command ID: `ruyi.venv.refresh`
 *
 * Responsibilities:
 * - Detect all Ruyi venv-s (activation state included) in the current workspace and update the Venv Tree View
 * via features/venv/VenvTree/VenvTreeProvider.createTreeView service.
 * - Automatically run on extension activation.
 * - Automatically run after any venv is activated/deactivated via `ruyi.venv.switch` command.
 * - Automatically run after any venv is created via `ruyi.venv.create` command.
 * - Automatically run after any venv is deleted via `ruyi.venv.clean` command.
 * - Cannot be run if no workspace is opened.
 * - Show information message if this is actively run and no venvs are found.
 */

import * as vscode from 'vscode'

import { detectVenv } from '../../features/venv/DetectforVenv'
import { VenvTreeProvider, VenvInfo } from '../../features/venv/VenvTree'

export const venvTree = new VenvTreeProvider()

export default function registerDetectAllVenvsCommand(
  context: vscode.ExtensionContext) {
  // Create status bar item for venv management
  const venvStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    1000,
  )
  venvStatusBarItem.text = '$(circle-slash) No Active Venv'
  venvStatusBarItem.tooltip = 'Manage Ruyi Virtual Environments'
  venvStatusBarItem.command = 'ruyiVenvsView.focus'
  venvStatusBarItem.show()
  context.subscriptions.push(venvStatusBarItem)

  // Link status bar to VenvTree for automatic updates
  venvTree.setStatusBarItem(venvStatusBarItem)

  const disposable = vscode.commands.registerCommand(
    'ruyi.venv.refresh', async (active: boolean = true) => {
      const venvs = detectVenv()
      if (venvs.length === 0) {
        if (active) {
          vscode.window.showInformationMessage('No Ruyi venvs detected in the current workspace.')
        }
      }
      // Update tree view with detected venvs
      const venvInfo: VenvInfo[] = venvs.map(v => ({
        name: v[1],
        path: v[0],
      }))
      venvTree.updateVenvs(venvInfo)
      const venvTreeView = vscode.window.createTreeView('ruyiVenvsView', {
        treeDataProvider: venvTree,
      })
      context.subscriptions.push(venvTreeView)
    })
  context.subscriptions.push(disposable)
}
