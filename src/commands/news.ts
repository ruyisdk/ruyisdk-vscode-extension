// SPDX-License-Identifier: Apache-2.0
/**
 * News Command Registration
 *
 * - Registers the tree view provider for news (`ruyiNewsView`)
 * - Registers `ruyi.news.read` command (reads by list number, No.)
 * - Registers filter commands: `ruyi.news.showUnread` / `ruyi.news.showAll`
 */

import * as vscode from 'vscode'

import createNewsPanel from '../features/news/NewsPanel'
import NewsService from '../features/news/NewsService'
import NewsTree from '../features/news/NewsTree'

export default function registerNewsCommands(ctx: vscode.ExtensionContext) {
  const svc = new NewsService()
  const provider = new NewsTree(svc)

  const view = vscode.window.createTreeView('ruyiNewsView', {
    treeDataProvider: provider,
  })

  const readCmd = vscode.commands.registerCommand(
    'ruyi.news.read', async (no?: number | string, title?: string) => {
      const n = typeof no === 'number'
        ? no
        : typeof no === 'string'
          ? Number(no)
          : NaN

      if (!Number.isFinite(n)) {
        vscode.window.showWarningMessage('Select a news item to read.')
        return
      }
      try {
        const body = await svc.read(n)
        createNewsPanel(body, title || `Ruyi News #${n}`, ctx)
      }
      catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        vscode.window.showErrorMessage(`Failed to read: ${msg}`)
      }
    })

  const showUnreadCmd = vscode.commands.registerCommand(
    'ruyi.news.showUnread', () => provider.setFilterUnreadOnly(true))

  const showAllCmd = vscode.commands.registerCommand(
    'ruyi.news.showAll', () => provider.setFilterUnreadOnly(false))

  const searchCmd = vscode.commands.registerCommand(
    'ruyi.news.search', async () => {
      const query = await vscode.window.showInputBox({
        prompt: 'Search news by title, date, or ID',
        placeHolder: 'Enter search term...',
        value: provider.getSearchQuery(),
        ignoreFocusOut: true,
      })
      if (query !== undefined) {
        provider.setSearchQuery(query)
      }
    })

  const clearSearchCmd = vscode.commands.registerCommand(
    'ruyi.news.clearSearch', () => provider.setSearchQuery(''))

  ctx.subscriptions.push(view, readCmd, showUnreadCmd, showAllCmd, searchCmd, clearSearchCmd)
}
