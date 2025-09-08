// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - News Webview Panel
 *
 * Opens a webview panel to render news content as Markdown
 * Uses a locally packaged "media/marked.min.js"
 */

import * as vscode from 'vscode'

export default function createNewsPanel(
  content: string, title = 'Ruyi News', ctx: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    'ruyiNewsReader', title, vscode.ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(ctx.extensionUri, 'media')],
    })
  panel.webview.html = getHtml(panel.webview, content, title, ctx)
  return panel
}

function getHtml(
  webview: vscode.Webview, markdownText: string, title: string,
  ctx: vscode.ExtensionContext): string {
  const nonce = getNonce()

  // Local script: /media/marked.umd.js
  const markedJs = webview.asWebviewUri(
    vscode.Uri.joinPath(ctx.extensionUri, 'media', 'marked.umd.js'))

  // Strict CSP: no remote sources, scripts must carry the nonce
  const csp = [
    `default-src 'none';`,
    `img-src ${webview.cspSource} https:;`,
    `style-src 'unsafe-inline' ${webview.cspSource};`,
    `script-src ${webview.cspSource} 'nonce-${nonce}';`,
  ].join(' ')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titleEscape(title)}</title>
<style>
  body { font-family: var(--vscode-font-family); padding: 16px; }
  h1, h2, h3 { color: var(--vscode-editor-foreground); }
  pre, code { background: var(--vscode-editor-background); padding: 4px; border-radius: 4px; }
  ul { padding-left: 20px; }
</style>
</head>
<body>
  <div id="content"></div>
  <script nonce="${nonce}" src="${markedJs}"></script>
  <script nonce="${nonce}">
    const raw = ${JSON.stringify(markdownText)};
    document.getElementById('content').innerHTML = marked.parse(raw);
  </script>
</body>
</html>`
}

function getNonce(): string {
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let s = ''
  for (let i = 0; i < 32; i++) s += c[Math.floor(Math.random() * c.length)]
  return s
}

function titleEscape(t: string): string {
  return t.replace(/[&<>"']/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#39;',
  }[s]!))
}
