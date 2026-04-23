// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

import * as copilot from './board-docs-copilot.provider'

let panel: vscode.WebviewPanel | undefined

export function showBoardDocsPanel(ctx: vscode.ExtensionContext) {
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
  panel.webview.html = getHtml()
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
