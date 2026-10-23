// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

import ruyi from '../ruyi'

import { PackagesTreeProvider } from './package-tree.provider'

export default function registerRefreshCommand(ctx: vscode.ExtensionContext, provider: PackagesTreeProvider) {
  const disposable = vscode.commands.registerCommand(
    'ruyi.packages.refresh',
    async (quiet: boolean | undefined) => {
      if (quiet) {
        return await doUpdate(provider)
      }
      else {
        return await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: vscode.l10n.t('Updating package index...'),
            cancellable: false,
          },
          async () => {
            return await doUpdate(provider)
          },
        )
      }
    },
  )

  ctx.subscriptions.push(disposable)
}

async function doUpdate(provider: PackagesTreeProvider): Promise<boolean> {
  const result = await ruyi.update()
  if (result.code !== 0) {
    const errorMsg = result.stderr || result.stdout || vscode.l10n.t('Unknown error')
    onError(errorMsg)
    return false
  }
  vscode.window.showInformationMessage(vscode.l10n.t('Package index updated successfully.'))
  await provider.shallowRefresh()
  return true
}

async function onError(errorMsg: string): Promise<void> {
  const choice = await vscode.window.showErrorMessage(
    vscode.l10n.t('Failed to update package index.'),
    vscode.l10n.t('View Details'),
  )
  if (choice === vscode.l10n.t('View Details')) {
    const document = await vscode.workspace.openTextDocument({
      content: errorMsg,
      language: 'text',
    })
    await vscode.window.showTextDocument(document, { preview: false })
  }
  return
}
