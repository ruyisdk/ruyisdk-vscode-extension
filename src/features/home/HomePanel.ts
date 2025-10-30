// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

let panel: vscode.WebviewPanel | undefined

export default function showHomePanel(ctx: vscode.ExtensionContext) {
  if (panel) {
    panel.reveal(vscode.ViewColumn.One)
    return
  }

  panel = vscode.window.createWebviewPanel('ruyiHome', 'RuyiSDK', vscode.ViewColumn.One, {
    enableScripts: true,
  })

  panel.onDidDispose(() => {
    panel = undefined
  }, null, ctx.subscriptions)
  panel.webview.onDidReceiveMessage(handleMessage, undefined, ctx.subscriptions)
  panel.webview.html = html
}

async function handleMessage(msg: { type: string }) {
  if (msg.type === 'openNews') {
    await vscode.commands.executeCommand('ruyi.news.showCards')
  }
  else if (msg.type === 'openPackages') {
    await vscode.commands.executeCommand('ruyiPackagesView.focus')
  }
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 48px 32px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(180deg, rgba(22,22,22,0.95), rgba(0,0,0,0.9));
      color: #f5f5f5;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 32px;
    }
    h1 { margin: 0; font-size: 40px; font-weight: 600; }
    .subtitle { margin: 8px 0 0; font-size: 18px; color: #c5c5c5; }
    .cards { display: flex; gap: 24px; flex-wrap: wrap; max-width: 960px; }
    .card {
      flex: 1 1 320px;
      min-height: 200px;
      padding: 32px;
      border-radius: 20px;
      background: rgba(40, 40, 40, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 18px 38px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      backdrop-filter: blur(12px);
    }
    .card h2 { margin: 0 0 12px; font-size: 28px; }
    .card p { margin: 0 0 28px; color: #c5c5c5; font-size: 15px; line-height: 1.6; }
    button {
      padding: 10px 26px;
      font-size: 15px;
      color: #cfe0ff;
      background: transparent;
      border-radius: 999px;
      border: 1px solid #337dff;
      cursor: pointer;
      transition: all 0.2s;
    }
    button:hover {
      background: rgba(51, 125, 255, 0.18);
      box-shadow: 0 0 0 2px rgba(51, 125, 255, 0.25);
    }
    .notice {
      margin-top: 16px;
      padding: 16px 24px;
      border-radius: 16px;
      background: rgba(80, 80, 80, 0.28);
      border: 1px solid rgba(255, 255, 255, 0.04);
      color: #c5c5c5;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <header>
    <h1>RuyiSDK</h1>
    <p class="subtitle">Welcome to RuyiSDK — your all-in-one toolkit for development and package management.</p>
  </header>
  <section class="cards">
    <article class="card">
      <div>
        <h2>News</h2>
        <p>View the latest RuyiSDK release notes and announcements</p>
      </div>
      <button onclick="vscode.postMessage({type:'openNews'})">View News</button>
    </article>
    <article class="card">
      <div>
        <h2>Packages</h2>
        <p>Browse, install, and manage software packages</p>
      </div>
      <button onclick="vscode.postMessage({type:'openPackages'})">Browse Packages</button>
    </article>
  </section>
  <div class="notice">This version currently provides the News feature only. Packages will be available in future updates.</div>
  <script>const vscode = acquireVsCodeApi();</script>
</body>
</html>`
