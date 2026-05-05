// SPDX-License-Identifier: Apache-2.0

/**
 * RuyiSDK VS Code Extension - News Module - Webview Provider
 *
 * Provides the UI layer for the news experience:
 * - Renders news cards in a webview with search/filter/refresh controls.
 * - Opens a markdown reader panel for detailed news content.
 * - Handles messages from the webview and coordinates with NewsService.
 */

import * as vscode from 'vscode'

import { getCardsHtml, getErrorHtml } from './news-cards.view'
import { getReaderHtml } from './news-reader.view'
import { NewsService, type NewsRow } from './news.service'

type NewsWebviewMessage
  = | { type: 'openSearch' }
    | { type: 'clearSearch' }
    | { type: 'toggleFilter' }
    | { type: 'refresh' }
    | { type: 'read', no?: unknown, title?: unknown }

export class NewsWebviewProvider {
  private panel: vscode.WebviewPanel | undefined
  private showUnreadOnly = false
  private searchQuery = ''

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly service: NewsService,
  ) {}

  registerStatusBar(): vscode.Disposable {
    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000)
    item.text = '$(info) Read RuyiNews'
    item.tooltip = 'Open Ruyi News Cards'
    item.command = 'ruyi.news.showCards'
    item.show()
    return item
  }

  async showCards(): Promise<void> {
    if (this.panel) {
      this.panel.reveal()
      await this.updateContent()
      return
    }

    this.panel = vscode.window.createWebviewPanel(
      'ruyiNewsCards',
      'Ruyi News Cards',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')],
      },
    )

    this.panel.onDidDispose(() => {
      this.panel = undefined
    })

    this.panel.webview.onDidReceiveMessage((message) => {
      void this.handleMessage(message)
    })

    await this.updateContent()
  }

  async promptSearch(): Promise<void> {
    const query = await vscode.window.showInputBox({
      prompt: 'Search news by title, date, or ID',
      placeHolder: 'Enter search term...',
      value: this.searchQuery,
      ignoreFocusOut: true,
    })
    if (query !== undefined) {
      this.setSearchQuery(query)
    }
  }

  clearSearch(): void {
    this.setSearchQuery('')
  }

  private async handleMessage(message: NewsWebviewMessage): Promise<void> {
    switch (message.type) {
      case 'openSearch':
        await this.promptSearch()
        break
      case 'clearSearch':
        this.clearSearch()
        break
      case 'toggleFilter':
        this.toggleFilter()
        break
      case 'refresh':
        await this.refreshData()
        break
      case 'read':
        await this.readNews(message)
        break
      default:
        break
    }
  }

  private async refreshData(): Promise<void> {
    try {
      await this.service.list(false, true)
      // Panel may have been closed during async operation
      if (!this.panel) return

      await this.updateContent()
      vscode.window.showInformationMessage('News data refreshed successfully')
    }
    catch (error) {
      if (!this.panel) return
      const msg = error instanceof Error ? error.message : String(error)
      vscode.window.showErrorMessage(`Failed to refresh news: ${msg}`)
    }
  }

  private async readNews(message: { no?: unknown, title?: unknown }): Promise<void> {
    if (typeof message.no !== 'number') return
    const title = typeof message.title === 'string' ? message.title : `Ruyi News #${message.no}`
    try {
      const { defaultLocale, content, availableLocales } = await this.service.readDefault(message.no)
      this.openReader(message.no, { [defaultLocale]: content }, availableLocales, title)
      await this.updateContent()
    }
    catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      vscode.window.showErrorMessage(`Failed to read news: ${msg}`)
    }
  }

  private toggleFilter(): void {
    this.showUnreadOnly = !this.showUnreadOnly
    void this.updateContent()
  }

  private setSearchQuery(query: string): void {
    this.searchQuery = query.trim().toLowerCase()
    void this.updateContent()
  }

  private async updateContent(): Promise<void> {
    if (!this.panel) return

    try {
      const rows = await this.service.list(this.showUnreadOnly)
      // Re-check after async operation - panel may have been closed
      if (!this.panel) return

      const sortedRows = rows.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0
        const dateB = b.date ? new Date(b.date).getTime() : 0
        return dateB - dateA
      })

      const filteredRows = this.searchQuery
        ? sortedRows.filter(row => this.matchesSearch(row))
        : sortedRows

      this.panel.webview.html = getCardsHtml(this.panel.webview, this.searchQuery, filteredRows, this.showUnreadOnly)
    }
    catch (error) {
      if (!this.panel) return
      const msg = error instanceof Error ? error.message : String(error)
      this.panel.webview.html = getErrorHtml(msg)
    }
  }

  private matchesSearch(row: NewsRow): boolean {
    if (!this.searchQuery) return true
    const query = this.searchQuery.toLowerCase()
    const title = row.title?.toLowerCase() || ''
    const date = row.date?.toLowerCase() || ''
    const id = row.id?.toLowerCase() || ''
    return title.includes(query) || date.includes(query) || id.includes(query)
  }

  private openReader(no: number, versions: Record<string, string>, availableLocales: string[], title: string): void {
    const panel = vscode.window.createWebviewPanel(
      'ruyiNewsReader',
      title,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')],
      },
    )

    panel.webview.html = getReaderHtml(panel.webview, this.context.extensionUri, versions, availableLocales, title)

    panel.webview.onDidReceiveMessage(async (msg: { type: string, locale?: string }) => {
      if (msg.type === 'fetchLocale' && typeof msg.locale === 'string') {
        try {
          const localeContent = await this.service.readLocale(no, msg.locale)
          void panel.webview.postMessage({ type: 'localeContent', locale: msg.locale, content: localeContent })
        }
        catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error)
          void panel.webview.postMessage({ type: 'localeError', locale: msg.locale, error: errMsg })
        }
      }
    })
  }
}
