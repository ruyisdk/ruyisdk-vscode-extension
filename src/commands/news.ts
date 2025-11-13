// SPDX-License-Identifier: Apache-2.0
/**
 * News Command Registration
 *
 * - Registers `ruyi.news.showCards` command for cards view
 * - Registers search helper commands: `ruyi.news.search` / `ruyi.news.clearSearch`
 */

import * as vscode from 'vscode'

import { logger } from '../common/logger.js'
import NewsCards from '../features/news/NewsCards'
import NewsService from '../features/news/NewsService'

export default function registerNewsCommands(ctx: vscode.ExtensionContext) {
  // Create status bar entry for quick access to news
  const newsStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    1000,
  )
  newsStatusBarItem.text = '$(info) Read RuyiNews'
  newsStatusBarItem.tooltip = 'Open Ruyi News Cards'
  newsStatusBarItem.command = 'ruyi.news.showCards'
  newsStatusBarItem.show()
  ctx.subscriptions.push(newsStatusBarItem)

  const svc = NewsService.getInstance(ctx)
  const cardsProvider = new NewsCards(svc)
  svc.initialize().catch((err: unknown) =>
    logger.warn('Failed to initialize news service:', err),
  )

  const searchCmd = vscode.commands.registerCommand(
    'ruyi.news.search', async () => {
      const query = await vscode.window.showInputBox({
        prompt: 'Search news by title, date, or ID',
        placeHolder: 'Enter search term...',
        value: cardsProvider.getSearchQuery(),
        ignoreFocusOut: true,
      })
      if (query !== undefined) {
        cardsProvider.setSearchQuery(query)
      }
    })

  const clearSearchCmd = vscode.commands.registerCommand(
    'ruyi.news.clearSearch', () => cardsProvider.setSearchQuery(''))

  const showCardsCmd = vscode.commands.registerCommand(
    'ruyi.news.showCards', async () => {
      await cardsProvider.showCards(ctx)
    })

  ctx.subscriptions.push(searchCmd, clearSearchCmd, showCardsCmd)
}
