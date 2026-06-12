import * as vscode from 'vscode'

import ruyi from '../ruyi'

export async function enableRepoCommand(repoId: string): Promise<void> {
  const result = await ruyi.repoEnable(repoId)
  if (result.code === 0) {
    vscode.window.showInformationMessage(vscode.l10n.t('Repository {0} enabled successfully', repoId))
  }
  else {
    vscode.window.showErrorMessage(vscode.l10n.t('Failed to enable repository {0}: {1}', repoId, result.stderr || 'Unknown error'))
  }
}

/**
 * Registers the `ruyi.repo.enable` command.
 * @param ctx - The extension context
 */
export default function registerEnableRepoCommand(ctx: vscode.ExtensionContext): void {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('ruyi.repo.enable', enableRepoCommand),
  )
}
