// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - News Cards View
 *
 * - Render news items as cards in a webview panel
 * - Sort by date (newest first)
 * - Show unread indicators
 * - Click to read news details
 */

import * as vscode from 'vscode'

import createNewsPanel from './NewsPanel'
import NewsService, { NewsRow } from './NewsService'

export default class NewsCards {
  private panel: vscode.WebviewPanel | undefined
  private svc: NewsService
  private showUnreadOnly = false
  private searchQuery = ''

  constructor(svc: NewsService) {
    this.svc = svc
  }

  toggleFilter() {
    this.setFilterUnreadOnly(!this.showUnreadOnly)
  }

  /**
   * Explicitly set filter state and refresh the view.
   * @param flag false → show all news; true → show only unread news
   */
  setFilterUnreadOnly(flag: boolean) {
    this.showUnreadOnly = flag
    if (this.panel) {
      this.updateContent()
    }
  }

  /**
   * Set search query and refresh the view.
   * @param query search term for filtering news by title, date, or ID
   */
  setSearchQuery(query: string) {
    this.searchQuery = query.trim().toLowerCase()
    if (this.panel) {
      this.updateContent()
    }
  }

  getSearchQuery(): string {
    return this.searchQuery
  }

  async showCards(context: vscode.ExtensionContext): Promise<void> {
    if (this.panel) {
      this.panel.reveal()
      return
    }

    this.panel = vscode.window.createWebviewPanel(
      'ruyiNewsCards',
      'Ruyi News Cards',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
      },
    )

    this.panel.onDidDispose(() => {
      this.panel = undefined
    })

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'openSearch':
          await vscode.commands.executeCommand('ruyi.news.search')
          break
        case 'clearSearch':
          await vscode.commands.executeCommand('ruyi.news.clearSearch')
          break
        case 'toggleFilter':
          this.setFilterUnreadOnly(!this.showUnreadOnly)
          await this.updateContent()
          break
        case 'refresh':
          try {
            await this.svc.list(false, true) // Force refresh
            await this.updateContent()
            vscode.window.showInformationMessage('News data refreshed successfully')
          }
          catch (error) {
            const msg = error instanceof Error ? error.message : String(error)
            vscode.window.showErrorMessage(`Failed to refresh news: ${msg}`)
          }
          break
        case 'read':
          try {
            const body = await this.svc.read(message.no)
            createNewsPanel(body, message.title || `Ruyi News #${message.no}`, context)
            // Auto-refresh after reading
            await this.updateContent()
          }
          catch (error) {
            const msg = error instanceof Error ? error.message : String(error)
            vscode.window.showErrorMessage(`Failed to read news: ${msg}`)
          }
          break
      }
    })

    await this.updateContent()
  }

  /**
   * Update the cards content
   */
  async updateContent(): Promise<void> {
    if (!this.panel) return

    try {
      const rows = await this.svc.list(this.showUnreadOnly)

      // Sort by date (newest first)
      const sortedRows = rows.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0
        const dateB = b.date ? new Date(b.date).getTime() : 0
        return dateB - dateA
      })

      // Apply search filter
      const filteredRows = this.searchQuery
        ? sortedRows.filter(row => this.matchesSearch(row))
        : sortedRows

      this.panel.webview.html = this.getHtml(filteredRows)
    }
    catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      this.panel.webview.html = this.getErrorHtml(msg)
    }
  }

  /**
   * Check if a news row matches the current search query
   */
  private matchesSearch(row: NewsRow): boolean {
    if (!this.searchQuery) return true

    const query = this.searchQuery.toLowerCase()
    const title = row.title?.toLowerCase() || ''
    const date = row.date?.toLowerCase() || ''
    const id = row.id?.toLowerCase() || ''

    return title.includes(query) || date.includes(query) || id.includes(query)
  }

  /**
   * Generate HTML for news cards
   */
  private getHtml(rows: NewsRow[]): string {
    const nonce = getNonce()
    const csp = [
      `default-src 'none';`,
      `style-src 'unsafe-inline' ${this.panel!.webview.cspSource};`,
      `script-src 'nonce-${nonce}';`,
    ].join(' ')

    const cardsHtml = rows.map(row => this.createCardHtml(row)).join('')

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ruyi News Cards</title>
<style>
  body {
    font-family: var(--vscode-font-family);
    background-color: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    margin: 0;
    padding: 16px;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--vscode-panel-border);
  }
  .title {
    font-size: 18px;
    font-weight: 600;
    color: var(--vscode-editor-foreground);
  }
  .controls {
    display: flex;
    gap: 8px;
  }
  .btn {
    padding: 6px 12px;
    border: 1px solid var(--vscode-button-border);
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }
  .btn:hover {
    background-color: var(--vscode-button-hoverBackground);
  }
  
  .cards-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }
  .card {
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    padding: 16px;
    background-color: var(--vscode-panel-background);
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
  }
  .card:hover {
    border-color: var(--vscode-focusBorder);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  .card.unread {
    border-left: 4px solid var(--vscode-progressBar-background);
    font-weight: 600;
  }
  .card.unread::before {
    content: "●";
    color: var(--vscode-progressBar-background);
    position: absolute;
    top: 12px;
    right: 12px;
    font-size: 16px;
  }
  .card-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 8px;
    line-height: 1.4;
    color: var(--vscode-editor-foreground);
  }
  .card-date {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 4px;
  }
  .card-id {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-editor-font-family);
  }
  .card-summary {
    margin-top: 8px;
    font-size: 12px;
    color: var(--vscode-foreground);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-word;
  }
  .empty-state {
    text-align: center;
    padding: 40px;
    color: var(--vscode-descriptionForeground);
  }
</style>
</head>
<body>
  <div class="header">
    <div class="title">Ruyi News</div>
    <div class="controls">
      <button class="btn" id="searchBtn">Search</button>
      <button class="btn" id="clearSearchBtn">Clear</button>
      <button class="btn" id="toggleFilter">${this.showUnreadOnly ? 'Show All' : 'Show Unread'}</button>
      <button class="btn" id="refreshBtn">Refresh</button>
    </div>
  </div>
  <div class="cards-container" id="cardsContainer">
    ${rows.length === 0 ? '<div class="empty-state">No news items found.</div>' : cardsHtml}
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.getElementById('searchBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'openSearch' });
    });

    document.getElementById('clearSearchBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'clearSearch' });
    });

    document.getElementById('toggleFilter').addEventListener('click', () => {
      vscode.postMessage({ type: 'toggleFilter' });
    });
    
    document.getElementById('refreshBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'refresh' });
    });
    
    document.querySelectorAll('.card').forEach(card => {
      card.addEventListener('click', () => {
        const no = card.dataset.no;
        const title = card.dataset.title;
        vscode.postMessage({ type: 'read', no: parseInt(no), title });
      });
    });
  </script>
</body>
</html>`
  }

  /**
   * Create HTML for a single news card
   */
  private createCardHtml(row: NewsRow): string {
    const isUnread = !row.read
    const cardClass = isUnread ? 'card unread' : 'card'

    return `<div class="${cardClass}" data-no="${row.no}" data-title="${this.escapeHtml(row.title)}">
      <div class="card-title">${this.escapeHtml(row.title)}</div>
      ${row.date ? `<div class="card-date">${this.escapeHtml(row.date)}</div>` : ''}
      <div class="card-id">#${row.no} • ${this.escapeHtml(row.id)}</div>
      ${row.summary ? `<div class="card-summary">${this.escapeHtml(row.summary)}</div>` : ''}
    </div>`
  }

  /**
   * Generate error HTML
   */
  private getErrorHtml(message: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Error</title>
</head>
<body>
  <div style="padding: 20px; color: var(--vscode-errorForeground);">
    <h3>Failed to load news</h3>
    <p>${this.escapeHtml(message)}</p>
  </div>
</body>
</html>`
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, match => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      '\'': '&#39;',
    }[match]!))
  }
}

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
