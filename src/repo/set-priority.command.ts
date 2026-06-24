import * as vscode from 'vscode'

import ruyi from '../ruyi'

export async function setPriorityCommand(repoId: string): Promise<void> {
  const input = await vscode.window.showInputBox({
    prompt: vscode.l10n.t('Enter the new priority for the repository'),
  })
  if (!input) {
    return
  }

  const priority = parseInt(input)
  if (isNaN(priority)) {
    vscode.window.showErrorMessage(vscode.l10n.t('Invalid priority value'))
    return
  }

  const result = await ruyi.repoSetPriority(repoId, priority)
  if (result.code === 0) {
    vscode.window.showInformationMessage(vscode.l10n.t(
      'Repository {0} priority set to {1} successfully',
      repoId, priority,
    ))
  }
  else {
    vscode.window.showErrorMessage(vscode.l10n.t(
      'Failed to set priority for repository {0}: {1}',
      repoId, result.stderr || 'Unknown error',
    ))
  }
}

/**
 * Registers the `ruyi.repo.set-priority` command.
 * @param ctx - The extension context
 */
export default function registerSetPriorityCommand(ctx: vscode.ExtensionContext): void {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('ruyi.repo.set-priority', setPriorityCommand),
  )
}
