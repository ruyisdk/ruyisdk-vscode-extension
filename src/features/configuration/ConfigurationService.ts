// SPDX-License-Identifier: Apache-2.0
/**
 * Configuration Service
 *
 * Manages all configuration for the Ruyi SDK extension.
 * Provides type-safe accessors and emits events on configuration changes.
 */

import * as vscode from 'vscode'

import { ConfigKey, CONFIG_KEYS } from '../../common/constants'
import { fullKey } from '../../common/helpers'

export type ConfigChangeHandler = (event: vscode.ConfigurationChangeEvent) => void

/**
 * Manages all configuration for the Ruyi SDK extension.
 * Provides type-safe accessors and emits events on configuration changes.
 */
class ConfigurationService implements vscode.Disposable {
  private readonly disposable: vscode.Disposable
  private readonly emitter = new vscode.EventEmitter<vscode.ConfigurationChangeEvent>()

  constructor() {
    // Listen for changes in the workspace configuration
    this.disposable = vscode.workspace.onDidChangeConfiguration((event) => {
      // When 'ruyi' configuration changes, call all registered handlers
      if (event.affectsConfiguration('ruyi')) {
        this.emitter.fire(event)
      }
    })

    this.registerConfigChangeHandler(this.handleRuyiPathChange.bind(this))
  }

  /**
  * Registers a handler for configuration changes.
  * @param handler The function to call when the configuration changes.
  * @returns Disposable that unregisters the handler.
   */
  public registerConfigChangeHandler(handler: ConfigChangeHandler): vscode.Disposable {
    return this.emitter.event(handler)
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
  public get<T>(key: ConfigKey, defaultValue: T): T {
    return this.config.get<T>(key, defaultValue)
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
  public async setTelemetry(enabled: boolean): Promise<void> {
    await this.config.update(CONFIG_KEYS.TELEMETRY, enabled, true)
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
    this.emitter.fire(syntheticEvent)
  }

  private handleRuyiPathChange(event: vscode.ConfigurationChangeEvent): void {
    if (event.affectsConfiguration(fullKey(CONFIG_KEYS.RUYI_PATH))) {
      vscode.window.showInformationMessage(
        'Ruyi path has been changed. Please reload the window for it to take effect.',
        'Reload Now',
        'Later',
      ).then((selection) => {
        if (selection === 'Reload Now') {
          vscode.commands.executeCommand('workbench.action.reloadWindow')
        }
      })
    }
  }

  public dispose() {
    this.disposable.dispose()
    this.emitter.dispose()
  }
}

export const configuration = new ConfigurationService()
