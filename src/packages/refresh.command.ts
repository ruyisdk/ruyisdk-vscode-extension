// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

import ruyi from '../ruyi'

import { PackagesTreeProvider } from './package-tree.provider'

export default function registerRefreshCommand(ctx: vscode.ExtensionContext, provider: PackagesTreeProvider) {
  const disposable = vscode.commands.registerCommand(
    'ruyi.packages.refresh',
    async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: vscode.l10n.t('Updating package index...'),
          cancellable: false,
        },
        async () => {
          const result = await ruyi.update()
          if (result.code !== 0) {
            const errorMsg = result.stderr || result.stdout || vscode.l10n.t('Unknown error')
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
          vscode.window.showInformationMessage(vscode.l10n.t('Package index updated successfully.'))
          await provider.shallowRefresh()
        },
      )
    },
  )

  ctx.subscriptions.push(disposable)
}
