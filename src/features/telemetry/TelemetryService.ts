// SPDX-License-Identifier: Apache-2.0
/**
 * TelemetryService
 *
 * Handles telemetry configuration prompts and settings for Ruyi.
 */

import * as vscode from 'vscode'

import { CONFIG_KEYS } from '../../common/constants'
import { fullKey } from '../../common/helpers'
import ruyi from '../../common/ruyi'
import { configuration } from '../configuration/ConfigurationService'

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
      configuration.setTelemetry(true)
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
      configuration.setTelemetry(false)
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

// Listen for telemetry configuration changes
configuration.registerConfigChangeHandler((event) => {
  if (event.affectsConfiguration(fullKey(CONFIG_KEYS.TELEMETRY))) {
    ruyi.telemetry(!!configuration.telemetryEnabled)
      .catch((err) => {
        vscode.window.showErrorMessage(`Error setting telemetry: ${err?.message ?? String(err)}`)
      })
  }
})
