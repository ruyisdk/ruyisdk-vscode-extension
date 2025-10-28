// SPDX-License-Identifier: Apache-2.0
/**
 * Venv Detect Command
 *
 * VS Code command ID: `ruyi.venv.detect`
 *
 * Responsibilities:
 * - Detect all Ruyi venv-s in the current workspace via features/detectVenvs service.
 * - Also automatically run before any venv is activated via `ruyi.venv.switch` command.
 * - Also automatically run before any venv is deleted via `ruyi.venv.clean` command.
 * - Can be run manually to just peek detected venvs.
 * - Cannot be run if no workspace is opened.
 * - Show information message with detected venvs or no venvs found.
 */

import * as vscode from 'vscode'

import { detectVenv } from '../../features/venv/DetectforVenv'

export default function registerDetectAllVenvCommand(
  context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    'ruyi.venv.detect', async (triggerMethod: string, active: boolean = true) => {
      const venvs = detectVenv()
      if (venvs.length === 0) {
        if (active) {
          vscode.window.showInformationMessage('No Ruyi venvs detected in the current workspace.')
        }
        return
      }
      else {
        const shownVenvList = venvs.map(v => ({
          label: v[1], description: `at ./${v[0]}`, rawPath: v[0] }))
        // Show a quick pick with detected venvs, which just inspect the venv if triggered by user,
        // activates the selected venv if triggered by switch command(on-activate run included),
        // and deletes the selected venv if triggered by clean command.
        const pickedVenv = await vscode.window.showQuickPick(shownVenvList, {
          placeHolder: `Select an Venv to ${triggerMethod === 'switch'
            ? 'activate'
            : triggerMethod === 'clean' ? 'delete' : 'view details'}.`,
          matchOnDescription: true, matchOnDetail: true,
        })
        if (!pickedVenv) {
          return
        }
        else {
          if (triggerMethod === 'switch' || triggerMethod === 'clean') {
          // Activate or Delete the selected venv by returning it to the caller
            return pickedVenv
          }
          else {
          // Just inspect the selected venv
          // TODO: Show more detailed info in a better way
            vscode.window.showInformationMessage(
              `Ruyi venv:\nName: ${pickedVenv.label}\nPath: ./${pickedVenv.rawPath}`)
            return
          }
        }
      }
    })

  context.subscriptions.push(disposable)
}
