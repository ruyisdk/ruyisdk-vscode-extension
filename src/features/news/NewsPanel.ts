// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - News Webview Panel
 *
 * Opens a webview panel to render news content as Markdown
 * using marked.js from CDN.
 */

import * as vscode from 'vscode';

export default function createNewsPanel(content: string, title = 'Ruyi News') {
  const panel = vscode.window.createWebviewPanel(
      'ruyiNewsReader', title, vscode.ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true,
      });

  const html = getHtml(panel.webview, content, title);
  panel.webview.html = html;
  return panel;
}

function getHtml(
    webview: vscode.Webview, markdownText: string, title: string): string {
  const nonce = getNonce();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none';
           img-src ${webview.cspSource} https:;
           style-src 'unsafe-inline' ${webview.cspSource};
           script-src 'nonce-${nonce}' https://cdn.jsdelivr.net;">
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
  <script nonce="${
      nonce}" src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script nonce="${nonce}">
    const raw = ${JSON.stringify(markdownText)};
    document.getElementById('content').innerHTML = marked.parse(raw);
  </script>
</body>
</html>`;
}

function getNonce(): string {
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 32; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

function titleEscape(t: string): string {
  return t.replace(/[&<>"']/g, (s) => ({
                                 '&': '&amp;',
                                 '<': '&lt;',
                                 '>': '&gt;',
                                 '"': '&quot;',
                                 '\'': '&#39;',
                               }[s]!));
}
