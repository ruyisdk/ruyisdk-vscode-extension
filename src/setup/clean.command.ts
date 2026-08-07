// SPDX-License-Identifier: Apache-2.0
/**
 * Clean command handlers
 */

import * as vscode from 'vscode'

import ruyi from '../ruyi'

export default function registerCleanCommand(ctx: vscode.ExtensionContext) {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('ruyi.clean', async () => {
      await promptForClean()
    }),
  )
}

async function promptForClean(): Promise<void> {
  const items = [
    {
      id: 'distfiles',
      iconPath: new vscode.ThemeIcon('cloud-download'),
      label: vscode.l10n.t('Downloaded Dist Files'),
      picked: true,
    },
    {
      id: 'installed-pkgs',
      iconPath: new vscode.ThemeIcon('package'),
      label: vscode.l10n.t('Installed Packages'),
      dangerous: true,
    },
    {
      id: 'news-read-status',
      iconPath: new vscode.ThemeIcon('book'),
      label: vscode.l10n.t('News Read Status'),
      dangerous: true,
    },
    {
      id: 'progcache',
      iconPath: new vscode.ThemeIcon('gear'),
      label: vscode.l10n.t('Ruyi Program Cache'),
      picked: true,
    },
    {
      id: 'repo',
      iconPath: new vscode.ThemeIcon('repo'),
      label: vscode.l10n.t('Repository Database'),
      dangerous: true,
    },
    {
      id: 'telemetry',
      iconPath: new vscode.ThemeIcon('telescope'),
      label: vscode.l10n.t('Telemetry Data'),
      picked: true,
    },
  ]
  const entries = await vscode.window.showQuickPick(items, {
    title: vscode.l10n.t('Select the RuyiSDK resources to clean'),
    canPickMany: true,
  })
  if (entries?.some(entry => entry.dangerous)) {
    const confirmed = await vscode.window.showWarningMessage(
      vscode.l10n.t('Are you sure you want to clean these resources?'),
      { modal: true },
      vscode.l10n.t('Yes'),
      vscode.l10n.t('No'),
    )
    if (confirmed !== vscode.l10n.t('Yes')) {
      return
    }
  }
  if (!entries || entries.length === 0) {
    vscode.window.showInformationMessage(vscode.l10n.t('No resources selected for cleaning.'))
    return
  }
  const selfCleanOptions = {
    distfiles: entries.some(entry => entry.id === 'distfiles'),
    installedPkgs: entries.some(entry => entry.id === 'installed-pkgs'),
    newsReadStatus: entries.some(entry => entry.id === 'news-read-status'),
    progcache: entries.some(entry => entry.id === 'progcache'),
    repo: entries.some(entry => entry.id === 'repo'),
    telemetry: entries.some(entry => entry.id === 'telemetry'),
  }
  const result = await ruyi.selfClean(selfCleanOptions)
  if (result.code === 0) {
    vscode.window.showInformationMessage(vscode.l10n.t('RuyiSDK resources cleaned successfully.'))
  }
  else {
    vscode.window.showErrorMessage(
      vscode.l10n.t('Failed to clean RuyiSDK resources: {0}', result.stderr),
    )
  }
}
