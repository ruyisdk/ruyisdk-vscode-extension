// SPDX-License-Identifier: Apache-2.0
import * as path from 'path'
import * as vscode from 'vscode'

import * as semver from 'semver'

import { configuration } from '../common/configuration'
import { CONFIG_KEYS } from '../common/constants'
import { fullKey } from '../common/helpers'
import { logger } from '../common/logger'

import { findRuyiExecutables, getRuyiVersion } from './manage.helper'

export interface ManageInstallation {
  path: string
  version?: string
  parsedVersion?: semver.SemVer
}

interface SetPathOptions {
  skipReload?: boolean
}

export class ManageService implements vscode.Disposable {
  private statusBarItem?: vscode.StatusBarItem
  private readonly disposables: vscode.Disposable[] = []
  private initialized = false

  public initialize(context: vscode.ExtensionContext): void {
    if (this.initialized) {
      return
    }

    this.initialized = true
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100,
    )
    this.statusBarItem.command = 'ruyi.setup.manage'
    this.statusBarItem.text = '$(tools) <No RuyiSDK>'
    this.statusBarItem.tooltip = 'Click to select RuyiSDK installation'
    this.statusBarItem.show()
    context.subscriptions.push(this.statusBarItem)

    const configListener = configuration.registerConfigChangeHandler((event) => {
      if (event.affectsConfiguration(fullKey(CONFIG_KEYS.RUYI_PATH))) {
        this.updateStatusBarItem().catch((error) => {
          logger.error('Failed to update Ruyi status bar item', error)
        })
      }
    })
    this.disposables.push(configListener)

    this.updateStatusBarItem().catch((error) => {
      logger.error('Failed to initialize Ruyi status bar item', error)
    })

    this.autoSelectLatest().catch((error) => {
      logger.error('Failed to auto-select latest RuyiSDK', error)
    })
  }

  public async listInstallations(): Promise<ManageInstallation[]> {
    logger.info('Scanning for RuyiSDK installations...')
    const candidates = await findRuyiExecutables()
    const versions = await Promise.all(candidates.map(candidate => getRuyiVersion(candidate)))

    const installations: ManageInstallation[] = candidates.map((candidate, index) => {
      const version = versions[index]
      return {
        path: candidate,
        version,
        parsedVersion: version ? semver.coerce(version) ?? undefined : undefined,
      }
    })

    installations.sort((a, b) => {
      if (a.parsedVersion && b.parsedVersion) {
        return semver.rcompare(a.parsedVersion, b.parsedVersion)
      }
      if (a.parsedVersion) return -1
      if (b.parsedVersion) return 1
      return a.path.localeCompare(b.path)
    })

    logger.info(`Found ${installations.length} RuyiSDK installation(s)`)
    return installations
  }

  public async setRuyiPath(newPath: string, options?: SetPathOptions): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('ruyi')
      await config.update(CONFIG_KEYS.RUYI_PATH, newPath, vscode.ConfigurationTarget.Global)

      await this.updateStatusBarItem()

      if (options?.skipReload) {
        logger.info(newPath ? `RuyiSDK path set to: ${newPath}` : 'RuyiSDK path cleared')
        return
      }

      const message = newPath
        ? `RuyiSDK path set to: ${newPath}`
        : 'RuyiSDK path cleared. Using automatic detection.'

      const choice = await vscode.window.showInformationMessage(
        message,
        'Reload Window',
        'Later',
      )

      if (choice === 'Reload Window') {
        await vscode.commands.executeCommand('workbench.action.reloadWindow')
      }
    }
    catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      logger.error('Failed to update Ruyi path configuration', error)
      vscode.window.showErrorMessage(`Failed to update configuration: ${reason}`)
    }
  }

  public async updateStatusBarItem(): Promise<void> {
    if (!this.statusBarItem) {
      return
    }

    const currentPath = configuration.ruyiPath
    if (!currentPath) {
      this.statusBarItem.text = '$(tools) <No RuyiSDK>'
      this.statusBarItem.tooltip = 'Click to select RuyiSDK installation'
      return
    }

    const version = await getRuyiVersion(currentPath)
    if (version) {
      const versionLabel = this.extractVersionLabel(version)
      this.statusBarItem.text = `$(tools) RuyiSDK ${versionLabel}`
      this.statusBarItem.tooltip = `RuyiSDK ${version}\nPath: ${path.dirname(currentPath)}`
    }
    else {
      this.statusBarItem.text = `$(tools) ${path.basename(currentPath)}`
      this.statusBarItem.tooltip = `RuyiSDK: ${path.dirname(currentPath)}`
    }
  }

  private async autoSelectLatest(): Promise<void> {
    if (configuration.ruyiPath) {
      logger.info('RuyiSDK path already configured, skipping auto-selection')
      return
    }

    const installations = await this.listInstallations()
    const valid = installations.filter(installation => installation.parsedVersion)
    if (valid.length === 0) {
      logger.warn('No RuyiSDK installations with valid versions found')
      return
    }

    const latest = valid[0]
    await this.setRuyiPath(latest.path, { skipReload: true })
    logger.info(`Auto-selected latest RuyiSDK: ${latest.version} at ${latest.path}`)
  }

  private extractVersionLabel(version: string): string {
    const match = version.match(/(\d+\.\d+\.\d+)/)
    return match ? match[1] : version
  }

  public dispose(): void {
    this.disposables.forEach(disposable => disposable.dispose())
    this.disposables.length = 0
    this.statusBarItem?.dispose()
    this.statusBarItem = undefined
    this.initialized = false
  }
}

export const manageService = new ManageService()
