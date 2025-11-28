// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

import { PackagesTreeProvider } from './package-tree.provider'

export default function registerRefreshCommand(
  ctx: vscode.ExtensionContext,
  provider: PackagesTreeProvider,
) {
  const disposable = vscode.commands.registerCommand(
    'ruyi.packages.refresh',
    async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Refreshing package list...',
          cancellable: false,
        },
        async () => {
          await provider.refresh()
        },
      )
    },
  )

  ctx.subscriptions.push(disposable)
}
