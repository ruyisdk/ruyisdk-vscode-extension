// SPDX-License-Identifier: Apache-2.0
/**
 * Configuration Service
 *
 * Manages all configuration for the Ruyi SDK extension.
 * Provides type-safe accessors and emits events on configuration changes.
 */

import * as vscode from 'vscode'

import { CONFIG_KEYS } from '../../common/constants'

/**
 * Manages all configuration for the Ruyi SDK extension.
 * Provides type-safe accessors and emits a single event on configuration change.
 */
class ConfigurationService implements vscode.Disposable {
  private readonly disposable: vscode.Disposable

  // Single event emitter for all configuration changes
  private readonly _onConfigChange = new vscode.EventEmitter<vscode.ConfigurationChangeEvent>()
  public readonly onConfigChange: vscode.Event<vscode.ConfigurationChangeEvent> = this._onConfigChange.event

  constructor() {
    // Listen for changes in the workspace configuration
    this.disposable = vscode.workspace.onDidChangeConfiguration((event) => {
      // Fire event when any 'ruyi' configuration changes
      if (event.affectsConfiguration('ruyi')) {
        this._onConfigChange.fire(event)
      }
    })
  }

  /**
   * Gets the root 'ruyi' configuration object.
   */
  private get config() {
    return vscode.workspace.getConfiguration('ruyi')
  }

  /**
   * Generic getter for any configuration value.
   * @param key The configuration key (without 'ruyi' prefix)
   * @param defaultValue The default value if the configuration is not set
   * @returns The configuration value
   */
  public get<T>(key: string, defaultValue: T): T {
    const normalizedKey = key.startsWith('ruyi.') ? key.slice('ruyi.'.length) : key
    return this.config.get<T>(normalizedKey, defaultValue)
  }

  // --- Type-safe Getters for each setting ---

  /**
   * Whether to automatically check for Ruyi updates when running detect command.
   */
  public get checkForUpdates(): boolean {
    return this.get(CONFIG_KEYS.CHECK_FOR_UPDATES, true)
  }

  /**
   * Custom path to the Ruyi executable.
   * Returns undefined if not set or empty string.
   */
  public get ruyiPath(): string | undefined {
    const path = this.get(CONFIG_KEYS.RUYI_PATH, '')
    return path.trim() || undefined
  }

  /**
   * Whether telemetry is enabled.
   * Returns undefined if not yet configured by user.
   */
  public get telemetryEnabled(): boolean | undefined {
    return this.get<boolean | undefined>(CONFIG_KEYS.TELEMETRY, undefined)
  }

  /**
   * Sets the telemetry configuration.
   * @param enabled True to enable telemetry, false to disable
   */
  public setTelemetry(enabled: boolean): void {
    this.config.update(CONFIG_KEYS.TELEMETRY, enabled, true)
  }

  /**
   * Reloads the configuration by firing change events.
   * This can be useful when you want to notify all listeners of potential configuration updates.
   */
  public reload(): void {
    // Create a synthetic configuration change event
    const syntheticEvent: vscode.ConfigurationChangeEvent = {
      affectsConfiguration: (section: string) => section.startsWith('ruyi'),
    }
    this._onConfigChange.fire(syntheticEvent)
  }

  public dispose() {
    this.disposable.dispose()
    this._onConfigChange.dispose()
  }
}

// Export a singleton instance of the service
export const configuration = new ConfigurationService()
