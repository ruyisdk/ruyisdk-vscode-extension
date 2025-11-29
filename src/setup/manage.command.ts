// SPDX-License-Identifier: Apache-2.0
import * as path from 'path'
import * as vscode from 'vscode'

import { configuration } from '../common/configuration'
import { logger } from '../common/logger'

import { manageService, type ManageInstallation } from './manage.service'

interface RuyiPathQuickPickItem extends vscode.QuickPickItem {
  targetPath: string
}

const MANUAL_TOKEN = '__manual__'

function validatePathInput(input: string): string | null {
  if (!input || input.trim() === '') {
    return 'Path cannot be empty'
  }
  if (!path.isAbsolute(input)) {
    return 'Please provide an absolute path'
  }
  return null
}

function toQuickPickItems(installations: ManageInstallation[]): RuyiPathQuickPickItem[] {
  return installations.map((installation) => {
    const versionSuffix = installation.version ? ` (${installation.version})` : ''
    return {
      label: `$(package) ${path.basename(installation.path)}${versionSuffix}`,
      description: path.dirname(installation.path),
      detail: installation.version ? `Version: ${installation.version}` : installation.path,
      targetPath: installation.path,
    }
  })
}

async function promptManualInput(): Promise<void> {
  const currentPath = configuration.ruyiPath || ''
  const manualPath = await vscode.window.showInputBox({
    prompt: 'Enter the full path to the ruyi executable',
    placeHolder: '/path/to/ruyi',
    value: currentPath,
    validateInput: validatePathInput,
  })

  if (manualPath) {
    await manageService.setRuyiPath(manualPath.trim())
  }
}

export default function registerManageCommand(ctx: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand('ruyi.setup.manage', async () => {
    try {
      const installations = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Detecting RuyiSDK installations...',
        },
        () => manageService.listInstallations(),
      )

      if (installations.length === 0) {
        const choice = await vscode.window.showInformationMessage(
          'No RuyiSDK installations found. Choose an option:',
          'Install RuyiSDK',
          'Enter Path Manually',
        )

        if (choice === 'Install RuyiSDK') {
          await vscode.commands.executeCommand('ruyi.setup')
        }
        else if (choice === 'Enter Path Manually') {
          await promptManualInput()
        }
        return
      }

      const items: RuyiPathQuickPickItem[] = toQuickPickItems(installations)
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
