// SPDX-License-Identifier: Apache-2.0
/**
 * Configuration Service
 *
 * Manages all configuration for the Ruyi SDK extension.
 * Provides type-safe accessors and emits events on configuration changes.
 */

import * as vscode from 'vscode'

import { ConfigKey, CONFIG_KEYS } from './constants'
import { fullKey } from './helpers'
import { logger } from './logger'

export type ConfigChangeHandler = (event: vscode.ConfigurationChangeEvent) => void

class ConfigurationService implements vscode.Disposable {
  private readonly disposable: vscode.Disposable
  private readonly emitter = new vscode.EventEmitter<vscode.ConfigurationChangeEvent>()

  constructor() {
    this.disposable = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('ruyi')) {
        this.emitter.fire(event)
      }
    })

    this.registerConfigChangeHandler(this.handleRuyiPathChange.bind(this))
  }

  public registerConfigChangeHandler(handler: ConfigChangeHandler): vscode.Disposable {
    return this.emitter.event(handler)
  }

  private get config() {
    return vscode.workspace.getConfiguration('ruyi')
  }

  public get<T>(key: ConfigKey, defaultValue: T): T {
    return this.config.get<T>(key, defaultValue)
  }

  public get checkForUpdates(): boolean {
    return this.get(CONFIG_KEYS.CHECK_FOR_UPDATES, true)
  }

  public get ruyiPath(): string | undefined {
    const path = this.get(CONFIG_KEYS.RUYI_PATH, '')
    return path.trim() || undefined
  }

  public get telemetryEnabled(): boolean | undefined {
    const inspect = this.config.inspect<boolean>(CONFIG_KEYS.TELEMETRY)
    return inspect?.workspaceFolderValue ?? inspect?.workspaceValue ?? inspect?.globalValue
  }

  public async setTelemetry(enabled: boolean): Promise<void> {
    await this.config.update(CONFIG_KEYS.TELEMETRY, enabled, true)
  }

  public reload(): void {
    const syntheticEvent: vscode.ConfigurationChangeEvent = {
      affectsConfiguration: (section: string) => section.startsWith('ruyi'),
    }
    this.emitter.fire(syntheticEvent)
  }

  private handleRuyiPathChange(event: vscode.ConfigurationChangeEvent): void {
    if (event.affectsConfiguration(fullKey(CONFIG_KEYS.RUYI_PATH))) {
      // Just log the change, reload prompt is handled by the command that made the change
      logger.info('Ruyi path configuration changed')
    }
  }

  public dispose() {
    this.disposable.dispose()
    this.emitter.dispose()
  }
}

export const configuration = new ConfigurationService()
