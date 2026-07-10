// SPDX-License-Identifier: Apache-2.0
import * as path from 'path'
import * as vscode from 'vscode'

import { configuration } from '../common/configuration'
import { logger } from '../common/logger'

import type { RuyiInstallation } from './manage.service'
import { detectRuyiInstallation, listAllInstallations, manageService } from './manage.service'
import { checkRuyiUpdate } from './setup.command'
import { telemetryService } from './telemetry.service'

interface RuyiPathQuickPickItem extends vscode.QuickPickItem {
  targetPath: string
}

const MANUAL_TOKEN = '__manual__'

async function promptManualInput(): Promise<void> {
  const selected = (await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    defaultUri: vscode.Uri.file(
      configuration.ruyiPath ? path.dirname(configuration.ruyiPath) : '/',
    ),
    title: vscode.l10n.t('Select RuyiSDK installation'),
    openLabel: vscode.l10n.t('Select RuyiSDK installation'),
  }))?.[0]
  if (!selected) {
    return
  }
  await manageService.setRuyiPath(selected.fsPath)
}

function buildQuickPickItems(installations: RuyiInstallation[]): RuyiPathQuickPickItem[] {
  const items = installations.map((installation) => {
    const versionSuffix = installation.version ? ` (${installation.version})` : ''
    const tagsDisplay = installation.tags && installation.tags.length > 0
      ? ` ${installation.tags.join(' ')}`
      : ''
    return {
      label: `$(package) ${path.basename(installation.path)}${versionSuffix}${tagsDisplay}`,
      description: path.dirname(installation.path),
      detail: installation.version ? vscode.l10n.t('Version: {0}', installation.version) : installation.path,
      targetPath: installation.path,
    }
  })

  if (configuration.ruyiPath) {
    items.unshift({
      label: '$(clear-all) ' + vscode.l10n.t('Clear Setting (Use Auto-detection)'),
      description: vscode.l10n.t('Remove custom path and use automatic detection'),
      detail: '',
      targetPath: '',
    })
  }

  items.push({
    label: '$(edit) ' + vscode.l10n.t('Manual Input'),
    description: vscode.l10n.t('Enter a custom path manually'),
    detail: '',
    targetPath: MANUAL_TOKEN,
  })

  return items
}

export function registerManageCommand(ctx: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand('ruyi.setup.manage', async () => {
    try {
      const installations = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: vscode.l10n.t('Detecting RuyiSDK installations...'),
        },
        () => listAllInstallations(),
      )

      if (installations.length === 0) {
        const choice = await vscode.window.showInformationMessage(
          vscode.l10n.t('RuyiSDK not found. Choose an option:'),
          vscode.l10n.t('Install RuyiSDK'),
          vscode.l10n.t('Enter Path Manually'),
        )

        if (choice === vscode.l10n.t('Install RuyiSDK')) {
          await vscode.commands.executeCommand('ruyi.setup.install')
        }
        else if (choice === vscode.l10n.t('Enter Path Manually')) {
          await promptManualInput()
        }
        return
      }

      const items = buildQuickPickItems(installations)

      const selection = await vscode.window.showQuickPick(items, {
        placeHolder: vscode.l10n.t('Select RuyiSDK installation'),
        matchOnDescription: true,
        matchOnDetail: true,
      })

      if (!selection) {
        return
      }

      if (selection.targetPath === MANUAL_TOKEN) {
        await promptManualInput()
        return
      }

      await manageService.setRuyiPath(selection.targetPath)
    }
    catch (error) {
      logger.error('Failed to manage Ruyi path', error)
      const reason = error instanceof Error ? error.message : String(error)
      vscode.window.showErrorMessage(`Failed to manage RuyiSDK path: ${reason}`)
    }
  })

  ctx.subscriptions.push(disposable)
}

export function registerDetectCommand(ctx: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand('ruyi.setup.detect', async (auto?: boolean) => {
    const installation = await detectRuyiInstallation()

    if (!installation) {
      // Delegate to manage command for unified "not found" handling
      await vscode.commands.executeCommand('ruyi.setup.manage')
      return
    }

    if (!installation.version) {
      vscode.window.showWarningMessage(
        vscode.l10n.t('Ruyi found at {0} but version check failed. Please check your installation.', installation.path),
      )
      return
    }

    if (!auto || !configuration.quietRuyiPath) {
      const message = vscode.l10n.t('Ruyi detected: {0} ({1})', installation.version, installation.path)
      if (auto) {
        const result = await vscode.window.showInformationMessage(message, vscode.l10n.t('Don\'t show again'))
        if (result === vscode.l10n.t('Don\'t show again')) {
          await configuration.setQuietRuyiPath(true)
        }
      }
      else {
        vscode.window.showInformationMessage(message)
      }
    }

    await vscode.commands.executeCommand('setContext', 'ruyi.tutorial.installationComplete', true)

    // Check for updates if enabled
    if (configuration.checkForUpdates) {
      checkRuyiUpdate(installation.version).catch((error) => {
        logger.error('Update check failed:', error)
      })
    }

    telemetryService.syncFromConfiguration().catch((error) => {
      logger.error('Telemetry sync failed:', error)
    })
  })

  ctx.subscriptions.push(disposable)
}
