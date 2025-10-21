// SPDX-License-Identifier: Apache-2.0
/**
 * Detect Command: checks if `ruyi` is available and shows version or install
 * hint.
 */

import * as vscode from 'vscode'

import { compareVersions, detectRuyiVersion, getLatestRuyiVersion } from '../features/detect/DetectService'

export default function registerDetectCommand(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('ruyi.detect', async () => {
    // Show progress indicator
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Detecting Ruyi...',
        cancellable: false,
      },
      async (progress) => {
        // Step 1: Detect local version
        progress.report({ message: 'Checking local installation...' })
        const localVersion = await detectRuyiVersion()

        if (!localVersion) {
          // Ruyi not found
          const choice = await vscode.window.showErrorMessage(
            'Ruyi not found.',
            'Install Ruyi',
            'Cancel',
          )
          if (choice === 'Install Ruyi') {
            vscode.commands.executeCommand('ruyi.install')
          }
          return
        }

        // Step 2: Get latest version from GitHub
        progress.report({ message: 'Checking for updates...' })
        const latestVersion = await getLatestRuyiVersion()

        if (!latestVersion) {
          // Network error or API unavailable
          vscode.window.showInformationMessage(
            `Ruyi detected: ${localVersion}\n(Unable to check for updates)`,
          )
          return
        }

        // Step 3: Compare versions
        const comparison = compareVersions(localVersion, latestVersion)

        if (comparison === null) {
          // Version comparison failed
          vscode.window.showInformationMessage(
            `Ruyi detected: ${localVersion}\nLatest version: ${latestVersion}`,
          )
        }
        else if (comparison < 0) {
          // Local version is older
          const choice = await vscode.window.showWarningMessage(
            `Ruyi ${localVersion} detected. A newer version ${latestVersion} is available.`,
            'Update Ruyi',
            'Ignore',
          )
          if (choice === 'Update Ruyi') {
            vscode.commands.executeCommand('ruyi.install')
          }
        }
        else if (comparison === 0) {
          // Up to date
          vscode.window.showInformationMessage(
            `Ruyi ${localVersion} is up to date.`,
          )
        }
        else {
          // Local version is newer (development version?)
          vscode.window.showInformationMessage(
            `Ruyi ${localVersion} detected (Latest stable: ${latestVersion})`,
          )
        }
      },
    )
  })
  context.subscriptions.push(disposable)
}
