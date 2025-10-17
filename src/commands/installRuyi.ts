// SPDX-License-Identifier: Apache-2.0
/**
 * InstallCommand
 *
 * VS Code command: `ruyi.install`
 *
 * Responsibilities:
 * - Check platform support
 * - Resolve Python interpreter from candidates (python3/python/py)
 * - Ask user for confirmation and show progress
 * - Perform pip install and report result
 */

import * as cp from 'child_process'
import * as util from 'util'
import * as vscode from 'vscode'

import { LONG_CMD_TIMEOUT_MS } from '../common/constants'
import { ruyiVersion } from '../common/RuyiInvoker'
import { formatExecError, resolvePython } from '../common/utils'

const execAsync = util.promisify(cp.exec)

export default function registerInstallCommand(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('ruyi.install', async () => {
    if (process.platform !== 'linux') {
      const choice = await vscode.window.showWarningMessage(
        'Automatic installation is only supported on Linux. Please install Ruyi manually.',
        'Open Installation Guide',
        'Cancel',
      )
      if (choice === 'Open Installation Guide') {
        vscode.env.openExternal(
          vscode.Uri.parse('https://ruyisdk.org/en/docs/Package-Manager/installation'),
        )
      }
      return
    }

    const py = await resolvePython()
    if (!py) {
      vscode.window.showErrorMessage(
        'No Python interpreter found (python3/python/py).')
      return
    }

    const choice = await vscode.window.showInformationMessage(
      'Python detected. Install/upgrade Ruyi via PyPI?',
      'Install',
      'Cancel',
    )
    if (choice !== 'Install') return

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Installing/Upgrading Ruyi via pip...',
      cancellable: false,
    }, async () => {
      try {
        await execAsync(
          `${py} -m pip install --user -U ruyi`, { timeout: LONG_CMD_TIMEOUT_MS })

        const version = await ruyiVersion()
        if (!version) {
          vscode.window.showWarningMessage(
            'Ruyi was installed, but the executable may not be discoverable. Add it to PATH or set RUYI_BIN to the full path.')
          return
        }
        vscode.window.showInformationMessage(`Ruyi installed: ${version}`)
      }
      catch (e: unknown) {
        vscode.window.showErrorMessage(`Failed to install Ruyi: ${formatExecError(e)}`)
      }
    })
  })
  context.subscriptions.push(disposable)
}
