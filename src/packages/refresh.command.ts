// SPDX-License-Identifier: Apache-2.0

import * as vscode from 'vscode'

import { PackagesTreeProvider } from './package-tree.provider'

export default function registerRefreshCommand(
  context: vscode.ExtensionContext,
  provider: PackagesTreeProvider,
) {
  const refreshDisposable = vscode.commands.registerCommand(
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

  context.subscriptions.push(refreshDisposable)
}
