// SPDX-License-Identifier: Apache-2.0
/**
 * TelemetryService
 *
 * Synchronizes the VS Code configuration with the underlying Ruyi CLI telemetry
 * state. Exposes helpers for user-facing commands to update telemetry and also
 * reacts to configuration edits performed via the Settings UI.
 */

import * as vscode from 'vscode'

import { configuration } from '../common/configuration'
import { CONFIG_KEYS } from '../common/constants'
import { fullKey } from '../common/helpers'
import ruyi from '../ruyi'
import type { TelemetryStatus } from '../ruyi'

export class TelemetryService implements vscode.Disposable {
  private readonly disposable: vscode.Disposable
  private skipNextConfigSync = false

  constructor() {
    this.disposable = configuration.registerConfigChangeHandler((event) => {
      if (!event.affectsConfiguration(fullKey(CONFIG_KEYS.TELEMETRY))) {
        return
      }

      if (this.skipNextConfigSync) {
        this.skipNextConfigSync = false
        return
      }

      this.syncFromConfiguration().catch((err) => {
        vscode.window.showErrorMessage(`Error setting telemetry: ${this.formatError(err)}`)
      })
    })
  }

  /**
   * Updates the VS Code configuration and applies the preference to the Ruyi CLI.
   */
  public async setTelemetryPreference(enabled: boolean): Promise<boolean> {
    this.skipNextConfigSync = true
    try {
      await configuration.setTelemetry(enabled)
    }
    catch (error) {
      this.skipNextConfigSync = false
      throw error
    }

    queueMicrotask(() => {
      this.skipNextConfigSync = false
    })

    return this.applyTelemetry(enabled)
  }

  /**
   * Mirrors the configuration value to the Ruyi CLI without modifying settings.
   */
  public async syncFromConfiguration(): Promise<boolean> {
    const enabled = configuration.telemetryEnabled
    if (enabled === undefined) {
      return false
    }

    return this.applyTelemetry(enabled)
  }

  private async applyTelemetry(enabled: boolean): Promise<boolean> {
    try {
      const result = await ruyi.telemetry(enabled)
      const expected: TelemetryStatus = enabled ? 'on' : 'off'
      if (result.status !== expected) {
        vscode.window.showErrorMessage(`Failed to ${enabled ? 'enable' : 'disable'} telemetry, status is ${result.status}`)
        return false
      }
      return true
    }
    catch (error) {
      vscode.window.showErrorMessage(`Error setting telemetry: ${this.formatError(error)}`)
      return false
    }
  }

  private formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
  }

  public dispose(): void {
    this.disposable.dispose()
  }
}

export const telemetryService = new TelemetryService()
