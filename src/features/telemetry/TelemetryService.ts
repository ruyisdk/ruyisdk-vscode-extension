// SPDX-License-Identifier: Apache-2.0
/**
 * TelemetryService
 *
 * Handles telemetry configuration prompts and settings for Ruyi.
 */

import * as vscode from 'vscode'

import ruyi from '../../common/ruyi'

/**
 * Prompts the user to configure Ruyi telemetry settings.
 * Shows a modal dialog with options to enable or disable telemetry.
 */
export async function promptForTelemetryConfiguration(): Promise<void> {
  const choice = await vscode.window.showInformationMessage(
    'Ruyi Telemetry: Help us improve by sending anonymous usage data. You can change this setting at any time.',
    { modal: false },
    'Enable (Recommended)',
    'Disable',
  )

  switch (choice) {
    case 'Enable (Recommended)':
      try {
        const result = await ruyi.telemetry(true)
        if (result.status === 'on') {
          vscode.window.showInformationMessage('Ruyi telemetry enabled. Thank you!')
        }
        else {
          vscode.window.showErrorMessage(`Failed to enable telemetry, status is ${result.status}`)
        }
      }
      catch (err) {
        vscode.window.showErrorMessage(`Error enabling telemetry: ${err}`)
      }
      break
    case 'Disable':
      try {
        const result = await ruyi.telemetry(false)
        if (result.status === 'off') {
          vscode.window.showInformationMessage('Ruyi telemetry disabled.')
        }
        else {
          vscode.window.showErrorMessage(`Failed to disable telemetry, status is ${result.status}`)
        }
      }
      catch (err) {
        vscode.window.showErrorMessage(`Error disabling telemetry: ${err}`)
      }
      break
    // TODO: Handle case where user dismisses the dialog
    // If user closes the dialog without choosing, need to filter telemetry status output
  }
}
