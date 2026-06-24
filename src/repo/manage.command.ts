// SPDX-License-Identifier: Apache-2.0

import * as vscode from 'vscode'

import { RuyiRepoListOutput } from '../ruyi/types'

import { getRepoList } from './repo.helper'

type RepoListQuickPickItem = vscode.QuickPickItem & { ty: 'addNewRepo' | 'repo', repo?: RuyiRepoListOutput }

async function manageRepoCommand(): Promise<void> {
  const items = await repoListForQuickPick()
  items.push({
    iconPath: new vscode.ThemeIcon('plus'),
    ty: 'addNewRepo',
    label: vscode.l10n.t('Add New Repository'),
    description: '',
    detail: '',
  })

  const selectedItem = await vscode.window.showQuickPick(items, {
    placeHolder: vscode.l10n.t('Select a repository to manage'),
  })
  if (!selectedItem) {
    return
  }

  if (selectedItem.ty === 'addNewRepo') {
    vscode.commands.executeCommand('ruyi.repo.add')
  }
  else if (selectedItem.ty === 'repo' && selectedItem.repo) {
    await manageSpecifiedRepo(selectedItem.repo)
  }
}

async function manageSpecifiedRepo(repo: RuyiRepoListOutput): Promise<void> {
  const items = [
    {
      id: 'remove',
      iconPath: new vscode.ThemeIcon('trash'),
      label: vscode.l10n.t('Remove'),
    },
    {
      id: 'setPriority',
      iconPath: new vscode.ThemeIcon('symbol-numeric'),
      label: vscode.l10n.t('Set Priority'),
    },
    {
      id: repo.active ? 'disable' : 'enable',
      iconPath: new vscode.ThemeIcon('chevron-right'),
      label: repo.active ? vscode.l10n.t('Disable') : vscode.l10n.t('Enable'),
    },
  ]
  const selectedItem = await vscode.window.showQuickPick(items)
  if (!selectedItem) {
    return
  }
  if (selectedItem.id == 'remove') {
    vscode.commands.executeCommand('ruyi.repo.remove', repo.id)
  }
  else if (selectedItem.id == 'setPriority') {
    vscode.commands.executeCommand('ruyi.repo.set-priority', repo.id)
  }
  else if (selectedItem.id == 'enable') {
    vscode.commands.executeCommand('ruyi.repo.enable', repo.id)
  }
  else if (selectedItem.id == 'disable') {
    vscode.commands.executeCommand('ruyi.repo.disable', repo.id)
  }
}

async function repoListForQuickPick(): Promise<RepoListQuickPickItem[]> {
  let repos = await getRepoList()
  repos = repos.sort((a, b) => a.priority - b.priority)
  const items: RepoListQuickPickItem[] = repos.map(repo => ({
    ty: 'repo',
    iconPath: new vscode.ThemeIcon('repo'),
    repo,
    label: `${repo.name} (${repo.id})`,
    description: `${repo.remote} [${repo.branch}]`,
    detail: buildDetailForRepo(repo),
  }))
  return items
}

function buildDetailForRepo(repo: RuyiRepoListOutput): string {
  const parts = [
    vscode.l10n.t('Local Path: {0}', repo.local_path || vscode.l10n.t('N/A')),
    vscode.l10n.t('Priority: {0}', repo.priority),
    repo.active ? vscode.l10n.t('Enabled') : vscode.l10n.t('Disabled'),
  ]
  if (repo.is_system) {
    parts.push(vscode.l10n.t('System'))
  }
  return parts.join(' | ')
}

/**
 * Registers the `ruyi.repo.manage` command.
 * @param ctx - The extension context
 */
export default function registerManageRepoCommand(ctx: vscode.ExtensionContext): void {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('ruyi.repo.manage', manageRepoCommand),
  )
}
