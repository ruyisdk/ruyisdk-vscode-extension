// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

import { logger } from '../common/logger'

import { NewsWebviewProvider } from './news-webview.provider'
import { NewsService } from './news.service'

export default function registerNewsCommands(ctx: vscode.ExtensionContext) {
  const service = NewsService.getInstance(ctx)
  const provider = new NewsWebviewProvider(ctx, service)

  service.initialize().catch((err: unknown) => {
    logger.warn('Failed to initialize news service:', err)
  })

  ctx.subscriptions.push(
    provider.registerStatusBar(),
    vscode.commands.registerCommand('ruyi.news.showCards', async () => {
      await provider.showCards()
    }),
    vscode.commands.registerCommand('ruyi.news.search', async () => {
      await provider.promptSearch()
    }),
    vscode.commands.registerCommand('ruyi.news.clearSearch', () => {
      provider.clearSearch()
    }),
  )
}
