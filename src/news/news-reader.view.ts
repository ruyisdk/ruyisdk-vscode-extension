// SPDX-License-Identifier: Apache-2.0

import * as vscode from 'vscode'

import { escapeHtml, getNonce } from './news-cards.view'

export function getReaderHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  versions: Record<string, string>,
  availableLocales: string[],
  title: string,
): string {
  const nonce = getNonce()
  const markdownItJs = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'media', 'markdown-it.min.js'))
  const highlightJs = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'media', 'highlight.min.js'))
  const highlightCss = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'media', 'highlight-vs2015.min.css'))

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
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="${highlightCss}">
<style>
  :root {
    --md-font: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
    --md-mono: var(--vscode-editor-font-family, 'SF Mono', 'Fira Code', Consolas, monospace);
    --md-fg: var(--vscode-editor-foreground);
    --md-bg: var(--vscode-editor-background);
    --md-border: var(--vscode-panel-border);
    --md-code-bg: var(--vscode-textCodeBlock-background, rgba(128,128,128,0.1));
    --md-blockquote: var(--vscode-textBlockQuote-border, #007acc);
    --md-link: var(--vscode-textLink-foreground, #4daafc);
    --md-th-bg: var(--vscode-editor-selectionBackground);
  }
  *, *::before, *::after { box-sizing: border-box; }
  body {
    font-family: var(--md-font);
    font-size: 14px;
    line-height: 1.7;
    color: var(--md-fg);
    background: var(--md-bg);
    margin: 0;
    padding: 0;
    max-width: 860px;
  }
  .lang-bar {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 4px;
    padding: 6px 16px;
    background: var(--vscode-editor-background);
    border-bottom: 1px solid var(--md-border);
  }
  .lang-btn {
    padding: 3px 10px;
    border: 1px solid var(--vscode-button-border, var(--md-border));
    background: transparent;
    color: var(--vscode-descriptionForeground);
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-family: var(--md-font);
    transition: all 0.15s;
  }
  .lang-btn:hover {
    background: var(--vscode-button-hoverBackground);
    color: var(--vscode-button-foreground);
  }
  .lang-btn.active {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border-color: var(--vscode-button-background);
    font-weight: 600;
  }
  .lang-btn:disabled {
    cursor: wait;
    opacity: 0.6;
  }
  .lang-bar.hidden { display: none; }
  #content { padding: 14px 32px 24px; }
  h1, h2, h3, h4, h5, h6 {
    font-weight: 600;
    line-height: 1.3;
    margin: 1.5em 0 0.5em;
    color: var(--md-fg);
  }
  #content h1:first-child,
  #content h2:first-child,
  #content h3:first-child,
  #content h4:first-child,
  #content h5:first-child,
  #content h6:first-child {
    margin-top: 0.35em;
  }
  h1 { font-size: 1.8em; border-bottom: 1px solid var(--md-border); padding-bottom: 0.3em; }
  h2 { font-size: 1.4em; border-bottom: 1px solid var(--md-border); padding-bottom: 0.2em; }
  h3 { font-size: 1.2em; }
  p { margin: 0.8em 0; }
  a { color: var(--md-link); text-decoration: none; }
  a:hover { text-decoration: underline; }
  ul, ol { padding-left: 1.5em; margin: 0.6em 0; }
  li { margin: 0.25em 0; }
  blockquote {
    margin: 1em 0;
    padding: 0.5em 1em;
    border-left: 4px solid var(--md-blockquote);
    background: var(--md-code-bg);
    color: var(--vscode-descriptionForeground, inherit);
    border-radius: 0 4px 4px 0;
  }
  blockquote p { margin: 0; }
  code {
    font-family: var(--md-mono);
    font-size: 0.9em;
    background: var(--md-code-bg);
    padding: 0.15em 0.4em;
    border-radius: 3px;
  }
  pre {
    margin: 1em 0;
    border-radius: 6px;
    overflow: auto;
    background: var(--md-code-bg) !important;
    border: 1px solid var(--md-border);
  }
  pre code {
    background: none;
    padding: 1em;
    display: block;
    font-size: 0.88em;
    line-height: 1.6;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
    font-size: 0.95em;
  }
  th {
    background: var(--md-th-bg);
    font-weight: 600;
    text-align: left;
  }
  th, td {
    border: 1px solid var(--md-border);
    padding: 0.5em 0.75em;
  }
  tr:nth-child(even) td { background: rgba(128,128,128,0.05); }
  img { max-width: 100%; height: auto; border-radius: 4px; }
  hr { border: none; border-top: 1px solid var(--md-border); margin: 1.5em 0; }
  .md-alert {
    margin: 1em 0;
    padding: 0.6em 1em;
    border-left: 4px solid;
    border-radius: 0 4px 4px 0;
  }
  .md-alert-title {
    font-weight: 600;
    font-size: 0.9em;
    margin-bottom: 0.4em;
    display: flex;
    align-items: center;
    gap: 0.4em;
  }
  .md-alert p { margin: 0.2em 0; }
  .md-alert-note      { border-color: #4493f8; background: rgba(68,147,248,0.08); }
  .md-alert-note      .md-alert-title { color: #4493f8; }
  .md-alert-tip       { border-color: #3fb950; background: rgba(63,185,80,0.08); }
  .md-alert-tip       .md-alert-title { color: #3fb950; }
  .md-alert-warning   { border-color: #d29922; background: rgba(210,153,34,0.08); }
  .md-alert-warning   .md-alert-title { color: #d29922; }
  .md-alert-important { border-color: #a371f7; background: rgba(163,113,247,0.08); }
  .md-alert-important .md-alert-title { color: #a371f7; }
  .md-alert-caution   { border-color: #f85149; background: rgba(248,81,73,0.08); }
  .md-alert-caution   .md-alert-title { color: #f85149; }
</style>
</head>
<body>
  <div class="lang-bar" id="langBar"></div>
  <div id="content"></div>
  <script nonce="${nonce}" src="${highlightJs}"></script>
  <script nonce="${nonce}" src="${markdownItJs}"></script>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const VERSIONS = ${JSON.stringify(versions)};
    const AVAILABLE_LOCALES = ${JSON.stringify(availableLocales)};
    const INITIAL_LOCALE = ${JSON.stringify(Object.keys(versions)[0])};
    const LANG_LABELS = { en_US: 'EN', zh_CN: '中文' };

    const md = window.markdownit({
      html: false,
      linkify: true,
      typographer: true,
      highlight: function(str, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return '<pre><code class="hljs language-' + lang + '">' +
              hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
              '</code></pre>';
          } catch {}
        }
        return '<pre><code class="hljs">' + md.utils.escapeHtml(str) + '</code></pre>';
      }
    });

    const ALERTS = {
      NOTE:      { icon: 'ℹ️', label: 'Note' },
      TIP:       { icon: '💡', label: 'Tip' },
      WARNING:   { icon: '⚠️', label: 'Warning' },
      IMPORTANT: { icon: '❗', label: 'Important' },
      CAUTION:   { icon: '🔥', label: 'Caution' },
    };

    function renderAlerts() {
      document.querySelectorAll('blockquote').forEach(bq => {
        const firstP = bq.querySelector('p');
        if (!firstP) return;
        const match = firstP.innerHTML.match(/^\\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\\]\\s*/i);
        if (!match) return;
        const key = match[1].toUpperCase();
        const { icon, label } = ALERTS[key];
        firstP.innerHTML = firstP.innerHTML.slice(match[0].length);
        bq.classList.add('md-alert', 'md-alert-' + key.toLowerCase());
        const titleEl = document.createElement('div');
        titleEl.className = 'md-alert-title';
        titleEl.textContent = icon + ' ' + label;
        bq.insertBefore(titleEl, firstP);
      });
    }

    function renderContent(locale) {
      document.getElementById('content').innerHTML = md.render(VERSIONS[locale] || '');
      renderAlerts();
    }

    let activeLocale = INITIAL_LOCALE;

    function setActiveBtn(locale) {
      document.querySelectorAll('.lang-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.locale === locale);
        b.disabled = false;
        b.textContent = LANG_LABELS[b.dataset.locale] || b.dataset.locale;
      });
    }

    function buildLangBar(currentLocale) {
      const bar = document.getElementById('langBar');
      if (AVAILABLE_LOCALES.length <= 1) { bar.classList.add('hidden'); return; }
      bar.innerHTML = '';
      AVAILABLE_LOCALES.forEach(locale => {
        const btn = document.createElement('button');
        btn.className = 'lang-btn' + (locale === currentLocale ? ' active' : '');
        btn.dataset.locale = locale;
        btn.textContent = LANG_LABELS[locale] || locale;
        btn.addEventListener('click', () => {
          if (VERSIONS[locale] !== undefined) {
            activeLocale = locale;
            renderContent(locale);
            setActiveBtn(locale);
          } else {
            btn.disabled = true;
            btn.textContent = '...';
            vscode.postMessage({ type: 'fetchLocale', locale });
          }
        });
        bar.appendChild(btn);
      });
    }

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'localeContent') {
        VERSIONS[msg.locale] = msg.content;
        activeLocale = msg.locale;
        renderContent(msg.locale);
        setActiveBtn(msg.locale);
      } else if (msg.type === 'localeError') {
        setActiveBtn(activeLocale);
      }
    });

    buildLangBar(INITIAL_LOCALE);
    renderContent(INITIAL_LOCALE);
  </script>
</body>
</html>`
}
