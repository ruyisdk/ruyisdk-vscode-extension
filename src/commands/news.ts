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
  const svc = NewsService.getInstance(ctx)
  const cardsProvider = new NewsCards(svc)

  // Initialize news service
  svc.initialize().catch((err: unknown) =>
    logger.warn('Failed to initialize news service:', err),
  )

  // Note: Tree view is removed, only cards view is available

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
