// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

import { PackagesTreeProvider } from './package-tree.provider'

export default function registerSearchCommand(
  ctx: vscode.ExtensionContext,
  provider: PackagesTreeProvider,
): void {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('ruyi.packages.search', async () => {
      // Preload all packages data before showing search input
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Preparing search...',
          cancellable: false,
        },
        async (progress) => {
          progress.report({ message: 'Loading all packages...' })
          await provider.prepareForSearch()
        },
      )

      // Now show search input - search will be instant
      const query = await vscode.window.showInputBox({
        prompt: 'Search packages by name or category',
        placeHolder: 'Enter search term...',
        value: provider.getSearchQuery(),
        ignoreFocusOut: true,
      })
      if (query !== undefined) {
        provider.setSearchQuery(query)
      }
    }),
  )

  ctx.subscriptions.push(
    vscode.commands.registerCommand('ruyi.packages.clearSearch', () => {
      provider.clearSearch()
    }),
  )
}
