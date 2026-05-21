// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

let panel: vscode.WebviewPanel | undefined
let extensionId = ''

export function showHomePanel(ctx: vscode.ExtensionContext) {
  extensionId = ctx.extension.id

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
  panel.webview.html = getHtml()
}

async function handleMessage(msg: { type: string }) {
  if (msg.type === 'openWalkthrough') {
    await vscode.commands.executeCommand('workbench.action.openWalkthrough', `${extensionId}#ruyi.welcome`, false)
  }
  else if (msg.type === 'openNews') {
    await vscode.commands.executeCommand('ruyi.news.showCards')
  }
  else if (msg.type === 'openPackages') {
    await vscode.commands.executeCommand('ruyiPackagesView.focus')
  }
  else if (msg.type === 'openForum') {
    await vscode.env.openExternal(vscode.Uri.parse('https://ruyisdk.cn'))
  }
  else if (msg.type === 'openBoardDocs') {
    await vscode.commands.executeCommand('ruyi.board-docs')
  }
}

function getHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      min-height: 100vh;
    }
    body {
      padding: 48px 32px;
      box-sizing: border-box;
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
      background-color: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 32px;
    }
    h1 { margin: 0; font-size: 40px; font-weight: 600; }
    .subtitle { margin: 8px 0 0; font-size: 18px; color: var(--vscode-descriptionForeground); }
    .cards { display: flex; gap: 24px; flex-wrap: wrap; max-width: 960px; }
    .card {
      flex: 1 1 220px;
      min-height: 200px;
      padding: 32px;
      border-radius: 12px;
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-panel-border, var(--vscode-widget-border));
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .card h2 { margin: 0 0 12px; font-size: 24px; color: var(--vscode-editor-foreground); }
    .card p { margin: 0 0 28px; color: var(--vscode-descriptionForeground); font-size: 14px; line-height: 1.6; }
    button {
      padding: 10px 26px;
      font-size: 14px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border-radius: 4px;
      border: none;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    button:focus {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: 2px;
    }
  </style>
</head>
<body>
  <header>
    <h1>RuyiSDK</h1>
    <p class="subtitle">${vscode.l10n.t('Welcome to RuyiSDK — your all-in-one toolkit for development and package management.')}</p>
  </header>
  <section class="cards">
    <article class="card">
      <div>
        <h2>${vscode.l10n.t('Walkthrough')}</h2>
        <p>${vscode.l10n.t('Open the getting started walkthrough and follow the guided setup flow')}</p>
      </div>
      <button onclick="vscode.postMessage({type:'openWalkthrough'})">${vscode.l10n.t('Open Walkthrough')}</button>
    </article>
    <article class="card">
      <div>
        <h2>${vscode.l10n.t('News')}</h2>
        <p>${vscode.l10n.t('View the latest RuyiSDK release notes and announcements')}</p>
      </div>
      <button onclick="vscode.postMessage({type:'openNews'})">${vscode.l10n.t('View News')}</button>
    </article>
    <article class="card">
      <div>
        <h2>${vscode.l10n.t('Package')}</h2>
        <p>${vscode.l10n.t('Browse, install, and manage software packages')}</p>
      </div>
      <button onclick="vscode.postMessage({type:'openPackages'})">${vscode.l10n.t('Browse Package')}</button>
    </article>
    <article class="card">
      <div>
        <h2>${vscode.l10n.t('RuyiSDK Examples')}</h2>
        <p>${vscode.l10n.t('Visit RuyiSDK Examples to run your first program on a RISC-V board.')}</p>
      </div>
      <button onclick="vscode.postMessage({type:'openBoardDocs'})">${vscode.l10n.t('Open RuyiSDK Examples')}</button>
    </article>
    <article class="card">
      <div>
        <h2>${vscode.l10n.t('Forum')}</h2>
        <p>${vscode.l10n.t('Visit the Ruyi community forum and discover more resources')}</p>
      </div>
      <button onclick="vscode.postMessage({type:'openForum'})">${vscode.l10n.t('Go to Forum')}</button>
    </article>
  </section>
  <script>const vscode = acquireVsCodeApi();</script>
</body>
</html>`
}
