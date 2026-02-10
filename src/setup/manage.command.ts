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
  const currentPath = configuration.ruyiPath || ''
  const manualPath = await vscode.window.showInputBox({
    prompt: 'Enter the full path to the ruyi executable',
    placeHolder: '/path/to/ruyi',
    value: currentPath,
    validateInput: (input: string) => {
      if (!input || input.trim() === '') {
        return 'Path cannot be empty'
      }
      if (!path.isAbsolute(input)) {
        return 'Please provide an absolute path'
      }
      return undefined
    },
  })

  if (manualPath) {
    await manageService.setRuyiPath(manualPath.trim())
  }
}

function buildQuickPickItems(installations: RuyiInstallation[]): RuyiPathQuickPickItem[] {
  const items = installations.map((installation) => {
    const versionSuffix = installation.version ? ` (${installation.version})` : ''
    const outdatedLabel = installation.isOutdated ? ' $(warning) Outdated' : ''
    return {
      label: `$(package) ${path.basename(installation.path)}${versionSuffix}${outdatedLabel}`,
      description: path.dirname(installation.path),
      detail: installation.version ? `Version: ${installation.version}` : installation.path,
      targetPath: installation.path,
    }
  })

  if (configuration.ruyiPath) {
    items.unshift({
      label: '$(clear-all) Clear Setting (Use Auto-detection)',
      description: 'Remove custom path and use automatic detection',
      detail: '',
      targetPath: '',
    })
  }

  items.push({
    label: '$(edit) Manual Input',
    description: 'Enter a custom path manually',
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
          title: 'Detecting RuyiSDK installations...',
        },
        listAllInstallations,
      )

      if (installations.length === 0) {
        const choice = await vscode.window.showInformationMessage(
          'RuyiSDK not found. Choose an option:',
          'Install RuyiSDK',
          'Enter Path Manually',
        )

        if (choice === 'Install RuyiSDK') {
          await vscode.commands.executeCommand('ruyi.setup.install')
        }
        else if (choice === 'Enter Path Manually') {
          await promptManualInput()
        }
        return
      }

      const items = buildQuickPickItems(installations)

      const selection = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select RuyiSDK installation',
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
  const disposable = vscode.commands.registerCommand('ruyi.setup.detect', async () => {
    const installation = await detectRuyiInstallation()

    if (!installation) {
      // Delegate to manage command for unified "not found" handling
      await vscode.commands.executeCommand('ruyi.setup.manage')
      return
    }

    if (!installation.version) {
      vscode.window.showWarningMessage(
        `Ruyi found at ${installation.path} but version check failed. Please check your installation.`,
      )
      return
    }

    vscode.window.showInformationMessage(
      `Ruyi detected: ${installation.version} (${installation.path})`,
    )

    await vscode.commands.executeCommand('setContext', 'ruyi.tutorial.installationComplete', true)

    // Check for updates if enabled
    if (configuration.checkForUpdates) {
      checkRuyiUpdate(installation.version).catch((error) => {
        logger.error('Update check failed:', error)
      })
    }

    // Sync telemetry setting
    telemetryService.syncFromConfiguration().catch((error) => {
      logger.error('Telemetry sync failed:', error)
    })
  })

  ctx.subscriptions.push(disposable)
}
