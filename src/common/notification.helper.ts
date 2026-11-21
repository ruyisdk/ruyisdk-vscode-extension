// SPDX-License-Identifier: Apache-2.0
import * as vscode from 'vscode'

/** Shows a non-modal error notification with an optional plain-text details document. */
export async function showErrorWithDetails(message: string, details: string): Promise<void> {
  const viewDetails = vscode.l10n.t('View Details')
  const choice = await vscode.window.showErrorMessage(message, viewDetails)
  if (choice === viewDetails) {
    const document = await vscode.workspace.openTextDocument({ content: details, language: 'text' })
    await vscode.window.showTextDocument(document, { preview: false })
  }
}
