// SPDX-License-Identifier: Apache-2.0

/**
 * RuyiSDK VS Code Extension - News Module - Command Entry
 *
 * Registers VS Code commands for the news module:
 * - Creates the quick access status bar item.
 * - Registers `ruyi.news.showCards`, `ruyi.news.search`, `ruyi.news.clearSearch`.
 * - Bridges user interactions to the webview provider and service layers.
 */

import * as vscode from 'vscode'

import { logger } from '../common/logger'

import { NewsWebviewProvider } from './news-webview.provider'
import { NewsService } from './news.service'

export function registerNewsModule(context: vscode.ExtensionContext): void {
  const service = NewsService.getInstance(context)
  const provider = new NewsWebviewProvider(context, service)

  service.initialize().catch((err: unknown) => {
    logger.warn('Failed to initialize news service:', err)
  })

  context.subscriptions.push(
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
