import * as vscode from 'vscode'

import ruyi from '../ruyi'

export async function addRepoCommand(): Promise<void> {
  // 1. Ask the user for repo ID
  const id = await vscode.window.showInputBox({
    prompt: vscode.l10n.t('Enter the repository ID'),
  })
  if (!id) {
    return
  }

  // 2. Ask the user for repo URL
  const url = await vscode.window.showInputBox({
    prompt: vscode.l10n.t('Enter the repository URL'),
  })
  if (!url) {
    return
  }

  // 3. Ask the user for repo name (optional)
  const name = await vscode.window.showInputBox({
    prompt: vscode.l10n.t('Enter the repository name (press ENTER to use default)'),
  })
  if (name === undefined) {
    return
  }

  // 4. Ask the user for repo priority (optional)
  const priorityInput = await vscode.window.showInputBox({
    prompt: vscode.l10n.t('Enter the repository priority (press ENTER to skip)'),
  })
  let priority: number | undefined = undefined
  if (priorityInput === undefined) {
    return
  }
  if (priorityInput) {
    priority = parseInt(priorityInput)
    if (isNaN(priority)) {
      vscode.window.showErrorMessage(vscode.l10n.t('Invalid repository priority'))
      return
    }
  }

  // 5. Ask the user for branch (optional)
  const branch = await vscode.window.showInputBox({
    prompt: vscode.l10n.t('Enter the repository branch (press ENTER to use default)'),
  })
  if (branch === undefined) {
    return
  }

  // 6. Ask the user for local path (optional)
  const local = await vscode.window.showInputBox({
    prompt: vscode.l10n.t('Enter the local path for the repository (press ENTER to use default)'),
  })
  if (local === undefined) {
    return
  }

  // 7. Call Ruyi to add the repository
  const result = await ruyi.repoAdd(
    id,
    url,
    {
      branch: branch || undefined,
      local: local || undefined,
      priority,
      name: name || undefined,
    },
  )
  if (result.code === 0) {
    vscode.window.showInformationMessage(vscode.l10n.t('Repository {0} added successfully', id))
  }
  else {
    vscode.window.showErrorMessage(vscode.l10n.t(
      'Failed to add repository {0}: {1}',
      id, result.stderr || 'Unknown error',
    ))
  }
}

/**
 * Registers the `ruyi.repo.add` command.
 * @param ctx - The extension context
 */
export default function registerAddRepoCommand(ctx: vscode.ExtensionContext): void {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('ruyi.repo.add', addRepoCommand),
  )
}
