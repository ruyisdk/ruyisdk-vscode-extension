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
            vscode.window.showErrorMessage(vscode.l10n.t('Failed to update package index.'))
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
