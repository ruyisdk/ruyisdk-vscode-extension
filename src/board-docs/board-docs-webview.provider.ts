// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

import { isNetworkAvailable } from '../common/helpers'

import * as copilot from './board-docs-copilot.provider'

let panel: vscode.WebviewPanel | undefined

export async function showBoardDocsPanel(ctx: vscode.ExtensionContext): Promise<void> {
  if (panel) {
    panel.reveal(vscode.ViewColumn.One)
    return
  }

  panel = vscode.window.createWebviewPanel('ruyiBoardDocs', vscode.l10n.t('RuyiSDK Examples'), vscode.ViewColumn.One, {
    enableScripts: true,
  })

  panel.onDidDispose(() => {
    panel = undefined
  }, null, ctx.subscriptions)
  panel.webview.onDidReceiveMessage(handleMessage, undefined, ctx.subscriptions)
  if (await isNetworkAvailable()) {
    panel.webview.html = getHtml()
  }
  else {
    panel.webview.html = getErrorHtml()
  }
}

async function handleMessage(msg: { type?: unknown, url?: unknown, text?: unknown }) {
  if (msg.type === 'copilot' && typeof msg.url === 'string') {
    copilot.openInCopilot(msg.url)
  }
  else if (msg.type === 'copy' && typeof msg.text === 'string') {
    try {
      await vscode.env.clipboard.writeText(msg.text)
    }
    catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      vscode.window.showErrorMessage(vscode.l10n.t('Failed to copy text: {0}', errMsg))
    }
  }
}

function getHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
      body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; }
      iframe { border: none; width: 100%; height: 100%; }
      #context-menu {
        position: fixed;
        z-index: 1;
        padding: 4px;
        border: 1px solid var(--vscode-menu-border, transparent);
        border-radius: 4px;
        background: var(--vscode-menu-background);
        box-shadow: 0 2px 8px var(--vscode-widget-shadow);
      }
      #context-menu[hidden] { display: none; }
      #context-menu button {
        padding: 4px 16px;
        border: 0;
        background: transparent;
        color: var(--vscode-menu-foreground);
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      #context-menu button:hover,
      #context-menu button:focus-visible {
        background: var(--vscode-menu-selectionBackground);
        color: var(--vscode-menu-selectionForeground);
        outline: none;
      }
  </style>
</head>
<body>
  <iframe src="https://boards.ruyisdk.org/" id="board-docs-iframe"></iframe>
  <div id="context-menu" role="menu" hidden>
    <button id="copy-selection" type="button" role="menuitem">${vscode.l10n.t('Copy')}</button>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const contextMenu = document.getElementById('context-menu');
    let selectedText = '';

    function hideContextMenu() {
      contextMenu.hidden = true;
    }

    window.addEventListener('message', event => {
      const message = event.data;
      if (message?.type === 'contextmenu') {
        if (typeof message.selection !== 'string' || !message.selection.trim()
          || !Number.isFinite(message.x) || !Number.isFinite(message.y)) {
          hideContextMenu();
          return;
        }

        selectedText = message.selection;
        contextMenu.hidden = false;
        const left = Math.min(message.x, window.innerWidth - contextMenu.offsetWidth);
        const top = Math.min(message.y, window.innerHeight - contextMenu.offsetHeight);
        contextMenu.style.left = Math.max(0, left) + 'px';
        contextMenu.style.top = Math.max(0, top) + 'px';
      }
      else if (message?.type === 'copilot') {
        vscode.postMessage(message);
      }
    });

    document.getElementById('copy-selection').addEventListener('click', () => {
      vscode.postMessage({ type: 'copy', text: selectedText });
      hideContextMenu();
    });

    document.addEventListener('click', event => {
      if (!contextMenu.contains(event.target)) hideContextMenu();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') hideContextMenu();
    });
  </script>
</body>
</html>`
}

function getErrorHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body, html {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: var(--vscode-editor-background, #1e1e1e);
      color: var(--vscode-editor-foreground, #cccccc);
      font-family: var(--vscode-font-family, "Segoe WPC", "Segoe UI", "Ubuntu", sans-serif);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      text-align: center;
      padding: 32px;
      max-width: 520px;
    }
    .icon {
      font-size: 72px;
      line-height: 1;
      margin-bottom: 24px;
      color: var(--vscode-editorWarning-foreground, #f8bd00);
    }
    .title {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 12px;
    }
    .message {
      font-size: 14px;
      line-height: 1.6;
      color: var(--vscode-editor-foreground, #cccccc);
      margin: 0;
    }
    .hint {
      margin-top: 20px;
      font-size: 13px;
      color: var(--vscode-editorHint-foreground, #9e9e9e);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⚠️</div>
    <h1 class="title">${vscode.l10n.t('Network Unavailable')}</h1>
    <p>${vscode.l10n.t('To use RuyiSDK Examples, you must be connected to the Internet.')}</p>
  </div>
</body>
</html>`
}
