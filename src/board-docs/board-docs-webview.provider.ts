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

  panel = vscode.window.createWebviewPanel('ruyiBoardDocs', 'RuyiSDK Board Docs', vscode.ViewColumn.One, {
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

async function handleMessage(msg: { type: string, url: string, model: string, profile: string }) {
  if (msg.type == 'copilot') {
    copilot.openInCopilot(msg.url)
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
  </style>
</head>
<body>
  <iframe src="https://board-docs-frontend.pages.dev/" id="board-docs-iframe"></iframe>
  <script lang="javascript">
    const vscode = acquireVsCodeApi();
    window.addEventListener('message', event => {
      vscode.postMessage(event.data);
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
