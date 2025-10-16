// SPDX-License-Identifier: Apache-2.0
/**
 * RuyiSDK VS Code Extension - Home Panel
 *
 * Provides a simple landing page with quick links to the News tree view and
 * Packages experience.
 */

import * as vscode from 'vscode'

let panel: vscode.WebviewPanel | undefined

type Message = { type: 'openNews' } | { type: 'openPackages' }

export default function showHomePanel(ctx: vscode.ExtensionContext) {
  if (panel) {
    panel.reveal(vscode.ViewColumn.One)
    return
  }

  panel = vscode.window.createWebviewPanel(
    'ruyiHome',
    'RuyiSDK',
    vscode.ViewColumn.One,
    { enableScripts: true },
  )

  panel.onDidDispose(
    () => {
      panel = undefined
    },
    null,
    ctx.subscriptions,
  )

  panel.webview.onDidReceiveMessage(async (msg: Message) => {
    switch (msg.type) {
      case 'openNews': {
        await vscode.commands.executeCommand('workbench.view.extension.ruyi')
        await vscode.commands.executeCommand('ruyi.news.showAll')
        break
      }
      case 'openPackages': {
        await vscode.window.showInformationMessage(
          'Packages feature is under development. Please stay tuned!',
        )
        break
      }
      default:
        break
    }
  }, undefined, ctx.subscriptions)

  panel.webview.html = getHtml()
}

function getHtml(): string {
  const title = 'RuyiSDK'
  const intro = 'Welcome to RuyiSDK — your all-in-one toolkit for development and package management.'
  const newsTitle = 'News'
  const newsDesc = 'View the latest RuyiSDK release notes and announcements'
  const packagesTitle = 'Packages'
  const packagesDesc = 'Browse, install, and manage software packages'
  const notice = 'This version currently provides the News feature only. Packages will be available in future updates.'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      color-scheme: light dark;
      --bg: rgba(31, 31, 31, 0.85);
      --text-primary: #f5f5f5;
      --text-secondary: #c5c5c5;
      --card-bg: rgba(40, 40, 40, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --button-border: #337dff;
      --button-text: #cfe0ff;
    }
    body {
      margin: 0;
      padding: 48px 32px 64px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(180deg, rgba(22,22,22,0.95), rgba(0,0,0,0.9));
      color: var(--text-primary);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 32px;
    }
    h1 {
      margin: 0;
      font-size: 40px;
      font-weight: 600;
    }
    p.subtitle {
      margin: 8px 0 0;
      font-size: 18px;
      color: var(--text-secondary);
    }
    .cards {
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
      justify-content: center;
      max-width: 960px;
      width: 100%;
    }
    .card {
      flex: 1 1 320px;
      min-height: 220px;
      padding: 32px 28px;
      border-radius: 20px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      box-shadow: 0 18px 38px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      backdrop-filter: blur(12px);
    }
    .card h2 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .card p {
      margin: 12px 0 28px;
      color: var(--text-secondary);
      font-size: 15px;
      line-height: 1.6;
    }
    button {
      align-self: flex-start;
      padding: 10px 26px;
      font-size: 15px;
      color: var(--button-text);
      background: transparent;
      border-radius: 999px;
      border: 1px solid var(--button-border);
      cursor: pointer;
      transition: background 0.2s ease, box-shadow 0.2s ease;
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
      color: var(--text-secondary);
      font-size: 14px;
    }
  </style>
</head>
<body>
  <header>
    <h1>${title}</h1>
    <p class="subtitle">${intro}</p>
  </header>
  <section class="cards">
    <article class="card">
      <div>
        <h2>${newsTitle}</h2>
        <p>${newsDesc}</p>
      </div>
      <button data-action="openNews">View News</button>
    </article>
    <article class="card">
      <div>
        <h2>${packagesTitle}</h2>
        <p>${packagesDesc}</p>
      </div>
      <button data-action="openPackages">Browse Packages</button>
    </article>
  </section>
  <div class="notice">${notice}</div>
  <script>
    (function () {
      const vscode = acquireVsCodeApi();
      document.body.addEventListener('click', (ev) => {
        const target = ev.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }
        const action = target.dataset.action;
        if (!action) {
          return;
        }
        vscode.postMessage({ type: action });
      });
    }());
  </script>
</body>
</html>`
}
