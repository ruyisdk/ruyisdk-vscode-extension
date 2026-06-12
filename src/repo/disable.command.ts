import * as vscode from 'vscode'

import ruyi from '../ruyi'

export async function disableRepoCommand(repoId: string): Promise<void> {
  const result = await ruyi.repoDisable(repoId)
  if (result.code === 0) {
    vscode.window.showInformationMessage(vscode.l10n.t('Repository {0} disabled successfully', repoId))
  }
  else {
    vscode.window.showErrorMessage(vscode.l10n.t('Failed to disable repository {0}: {1}', repoId, result.stderr || 'Unknown error'))
  }
}

/**
 * Registers the `ruyi.repo.disable` command.
 * @param ctx - The extension context
 */
export default function registerDisableRepoCommand(ctx: vscode.ExtensionContext): void {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('ruyi.repo.disable', disableRepoCommand),
  )
}
