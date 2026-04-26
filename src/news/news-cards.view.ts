// SPDX-License-Identifier: Apache-2.0

import * as vscode from 'vscode'

import type { NewsRow } from './news.service'

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, match => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#39;',
  }[match]!))
}

export function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function createCardHtml(row: NewsRow): string {
  const cardClass = row.read ? 'card' : 'card unread'
  return `<div class="${cardClass}" data-no="${row.no}" data-title="${escapeHtml(row.title)}">
      <div class="card-title">${escapeHtml(row.title)}</div>
      ${row.date ? `<div class="card-date">${escapeHtml(row.date)}</div>` : ''}
      <div class="card-id">#${row.no} • ${escapeHtml(row.id)}</div>
      ${row.summary ? `<div class="card-summary">${escapeHtml(row.summary)}</div>` : ''}
    </div>`
}

export function getCardsHtml(webview: vscode.Webview, rows: NewsRow[], showUnreadOnly: boolean): string {
  const nonce = getNonce()
  const csp = [
    `default-src 'none';`,
    `style-src 'unsafe-inline' ${webview.cspSource};`,
    `script-src 'nonce-${nonce}';`,
  ].join(' ')

  const cardsHtml = rows.map(row => createCardHtml(row)).join('')

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
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: flex-start;
  }
  .card {
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    padding: 16px;
    background-color: var(--vscode-panel-background);
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    flex: 1 1 300px;
    box-sizing: border-box;
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
  @keyframes ruyi-spin {
    from { transform: translate(-50%, -50%) rotate(0deg); }
    to { transform: translate(-50%, -50%) rotate(360deg); }
  }
  .card.loading {
    pointer-events: none;
    opacity: 0.6;
  }
  .card.loading::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 22px;
    height: 22px;
    border: 2px solid var(--vscode-panel-border);
    border-top-color: var(--vscode-progressBar-background);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    animation: ruyi-spin 0.7s linear infinite;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="title">Ruyi News</div>
    <div class="controls">
      <button class="btn" id="searchBtn">Search</button>
      <button class="btn" id="clearSearchBtn">Clear</button>
      <button class="btn" id="toggleFilter">${showUnreadOnly ? 'Show All' : 'Show Unread'}</button>
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
        card.classList.add('loading');
        document.querySelectorAll('.card').forEach(c => c.style.pointerEvents = 'none');
        vscode.postMessage({ type: 'read', no: parseInt(no), title });
      });
    });
  </script>
</body>
</html>`
}

export function getErrorHtml(message: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Error</title>
</head>
<body>
  <div style="padding: 20px; color: var(--vscode-errorForeground);">
    <h3>Failed to load news</h3>
    <p>${escapeHtml(message)}</p>
  </div>
</body>
</html>`
}
