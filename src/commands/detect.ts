// SPDX-License-Identifier: Apache-2.0
/**
 * Detect Command: checks if `ruyi` is available and shows version or install
 * hint.
 */

import * as vscode from 'vscode'

import { isSupportedPlatform } from '../common/utils'
import { detectRuyiVersion } from '../features/detect/DetectService'

export default function registerDetectCommand(
  context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    'ruyi.detect',
    async (opts?: { silent?: boolean }) => {
      if (!isSupportedPlatform()) {
        if (!opts?.silent) {
          vscode.window.showErrorMessage(
            'This extension currently supports Windows, macOS, and Linux.')
        }
        return
      }

      const version = await detectRuyiVersion()

      if (version) {
        if (!opts?.silent) {
          vscode.window.showInformationMessage(`Ruyi detected: ${version}`)
        }
        return
      }

      if (!opts?.silent) {
        const choice = await vscode.window.showErrorMessage(
          'Ruyi not found.',
          'Install Ruyi',
          'Open Guide',
          'Cancel',
        )
        if (choice === 'Install Ruyi') {
          void vscode.commands.executeCommand('ruyi.install')
        }
        else if (choice === 'Open Guide') {
          void vscode.env.openExternal(
            vscode.Uri.parse(
              'https://ruyisdk.org/en/docs/Package-Manager/installation'),
          )
        }
      }
    },
  )

  context.subscriptions.push(disposable)
}
