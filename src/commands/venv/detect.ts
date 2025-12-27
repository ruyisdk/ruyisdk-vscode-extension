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

import * as path from 'path'
import * as vscode from 'vscode'

import { getWorkspaceFolderPath } from '../../common/helpers'
import { logger } from '../../common/logger'
import { detectVenv } from '../../features/venv/DetectforVenv'
import { VenvTreeProvider, VenvInfo } from '../../features/venv/VenvTree'

export const venvTree = new VenvTreeProvider()

export default function registerDetectAllVenvsCommand(
  context: vscode.ExtensionContext) {
  // Create status bar item for venv management
  const venvStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  )
  venvStatusBarItem.text = '$(circle-slash) No Active Venv'
  venvStatusBarItem.tooltip = 'Manage Ruyi Virtual Environments'
  venvStatusBarItem.command = 'ruyiVenvsView.focus'
  venvStatusBarItem.show()
  context.subscriptions.push(venvStatusBarItem)
  venvTree.setStatusBarItem(venvStatusBarItem)

  // Create tree view for venv management
  const venvTreeView = vscode.window.createTreeView('ruyiVenvsView', {
    treeDataProvider: venvTree,
  })
  context.subscriptions.push(venvTreeView)

  const disposable = vscode.commands.registerCommand(
    'ruyi.venv.refresh', async () => {
      let workspaceRoot: string | undefined
      try {
        workspaceRoot = getWorkspaceFolderPath()
      }
      catch {
        // No workspace open; skip detection quietly
        logger.info('No workspace open; skipping venv detection.')
        return
      }

      const venvs = await detectVenv()
      // Update tree view with detected venvs
      const venvInfo: VenvInfo[] = venvs.map(v => ({
        name: v[1],
        path: path.join(workspaceRoot!, v[0]),
      }))
      venvTree.updateVenvs(venvInfo, workspaceRoot)
    })
  context.subscriptions.push(disposable)
}
