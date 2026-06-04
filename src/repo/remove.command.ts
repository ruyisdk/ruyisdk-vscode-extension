import * as vscode from 'vscode'

import ruyi from '../ruyi'

export async function removeRepoCommand(repoId: string): Promise<void> {
  const result = await ruyi.repoRemove(repoId, false)
  if (result.code === 0) {
    vscode.window.showInformationMessage(vscode.l10n.t('Repository {0} removed successfully', repoId))
  }
  else {
    vscode.window.showErrorMessage(vscode.l10n.t('Failed to remove repository {0}: {1}', repoId, result.stderr || 'Unknown error'))
  }
}

/**
 * Registers the `ruyi.repo.remove` command.
 * @param ctx - The extension context
 */
export default function registerRemoveRepoCommand(ctx: vscode.ExtensionContext): void {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('ruyi.repo.remove', removeRepoCommand),
  )
}
